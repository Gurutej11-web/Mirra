import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJSON, imagePart, textPart, VISION_MODEL } from "@/lib/ai";
import { apiHandler, jsonError, readImage } from "@/lib/api";
import { closetContext, loadClosetLines, profileContext } from "@/lib/context";
import { importProduct } from "@/lib/importer";
import { aiItemSchema } from "@/lib/item-schema";
import { colorDistance, pairScore } from "@/lib/colors";
import type { Profile } from "@/lib/types";

export const maxDuration = 60;

const verdictSchema = z.object({
  item: aiItemSchema,
  verdict: z.enum(["buy", "maybe", "skip"]).catch("maybe"),
  headline: z.string().max(100).catch(""),
  reasons: z.array(z.string().max(220)).catch([]).transform((r) => r.slice(0, 5)),
  pairs_with: z.array(z.string()).catch([]),
});

const PARTNERS: Record<string, string[]> = {
  top: ["bottom"], bottom: ["top"], dress: ["shoes", "outerwear"], outerwear: ["top", "dress"],
  shoes: ["bottom", "dress"], accessory: ["top", "dress"], other: ["top", "bottom"],
};

/**
 * "Do I need this?" — multipart { image } or { url }.
 * Returns a verdict plus closet maths: similar items, pieces it pairs with, outfits unlocked.
 */
export const POST = apiHandler("shop", { max: 10, windowMs: 60_000 }, async ({ supabase, user }, req) => {
  const form = await req.formData();
  const url = String(form.get("url") ?? "").trim();
  let dataUrl: string | null = null;
  let meta: { name: string | null; price: number | null; brand: string | null; source_url: string | null; image_src: string | null } = {
    name: null, price: null, brand: null, source_url: null, image_src: null,
  };

  if (url) {
    if (!z.string().url().max(1000).safeParse(url).success) return jsonError("That link doesn't look right.");
    try {
      const p = await importProduct(url);
      if (!p.image) return jsonError("Found the page but not a product photo — upload a screenshot instead.", 422);
      dataUrl = p.image;
      meta = { name: p.name, price: p.price, brand: p.brand, source_url: p.source_url, image_src: p.image_src };
    } catch (e) {
      return jsonError((e as Error).message, 422);
    }
  } else {
    dataUrl = (await readImage(form)).dataUrl;
  }

  const [{ data: profile }, closet] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    loadClosetLines(supabase),
  ]);

  const prompt = `You are Mirra, a thoughtful shopping advisor who helps people buy less but better.
Look at the product image${meta.name ? ` ("${meta.name}"${meta.price ? `, $${meta.price}` : ""})` : ""} and decide if this person should buy it, based on their closet and style.

About them:
${profileContext(profile as Profile | null)}

Closet (id | name | category | colors | formality | seasons | status | wear):
${closetContext(closet) || "(empty)"}

Consider: does it duplicate something they own, how many outfits it unlocks with their pieces, whether it suits their palette and style, versatility, and budget.
Reply with ONLY JSON:
{"item":{"name":"","category":"top|bottom|outerwear|shoes|dress|accessory|other","subcategory":"","colors":["#hex"],"pattern":"","material":"","formality":2,"seasons":[],"tags":[],"brand":null},
 "verdict":"buy|maybe|skip","headline":"one punchy sentence","reasons":["3-4 short specific reasons, referencing their pieces by name"],"pairs_with":["closet item ids it pairs well with"]}`;

  const ai = await aiJSON(verdictSchema, [{ role: "user", content: [textPart(prompt), imagePart(dataUrl!)] }], {
    model: VISION_MODEL,
    temperature: 0.3,
    maxTokens: 1500,
  });

  // Deterministic closet maths
  const color = ai.item.colors[0];
  const similar = closet
    .filter((c) => c.category === ai.item.category && color && c.colors[0] && colorDistance(c.colors[0], color) < 18)
    .map((c) => c.id);
  const partnerCats = PARTNERS[ai.item.category] ?? [];
  const partners = closet.filter((c) => partnerCats.includes(c.category) && (!color || !c.colors[0] || pairScore(color, c.colors[0]) >= 70));
  const shoes = closet.filter((c) => c.category === "shoes").length || 1;
  const outfitsUnlocked = ai.item.category === "shoes" || ai.item.category === "accessory" ? partners.length : partners.length * Math.min(shoes, 3);
  const ids = new Set(closet.map((c) => c.id));
  const pairsWith = Array.from(new Set([...ai.pairs_with.filter((i) => ids.has(i)), ...partners.slice(0, 6).map((p) => p.id)])).slice(0, 8);

  const best = (profile as Profile | null)?.palette?.best ?? [];
  const avoid = (profile as Profile | null)?.palette?.avoid ?? [];
  let match = 60 + Math.min(25, partners.length * 4) - similar.length * 12;
  if (color && best.some((b) => colorDistance(b, color) < 22)) match += 12;
  if (color && avoid.some((b) => colorDistance(b, color) < 18)) match -= 15;
  match = Math.max(5, Math.min(98, Math.round(match)));

  const result = {
    name: (meta.name ?? ai.item.name).slice(0, 80),
    price: meta.price,
    brand: meta.brand ?? ai.item.brand,
    url: meta.source_url,
    image_url: meta.image_src,
    image_data: meta.image_src ? null : dataUrl,
    item: ai.item,
    verdict: ai.verdict,
    headline: ai.headline,
    reasons: ai.reasons,
    similar_ids: similar.slice(0, 6),
    pairs_with: pairsWith,
    outfits_unlocked: outfitsUnlocked,
    match_score: match,
  };
  return NextResponse.json(result);
});

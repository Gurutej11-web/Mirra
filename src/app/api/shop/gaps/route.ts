import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJSON, TEXT_MODEL } from "@/lib/ai";
import { apiHandler, jsonError } from "@/lib/api";
import { closetContext, loadClosetLines, profileContext } from "@/lib/context";
import { normalizeHex } from "@/lib/colors";
import type { Profile } from "@/lib/types";

export const maxDuration = 60;

const schema = z.object({
  summary: z.string().max(400).catch(""),
  gaps: z
    .array(
      z.object({
        name: z.string().max(80),
        category: z.string().max(20).catch("other"),
        color: z.string().catch("#888888"),
        why: z.string().max(300).catch(""),
        unlocks: z.coerce.number().int().min(0).max(200).catch(0),
        pairs_with: z.array(z.string()).catch([]),
        priority: z.enum(["high", "medium", "low"]).catch("medium"),
      }),
    )
    .catch([]),
});

export const POST = apiHandler("gaps", { max: 5, windowMs: 60_000 }, async ({ supabase, user }) => {
  const [{ data: profile }, closet] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    loadClosetLines(supabase),
  ]);
  if (closet.length < 3) return jsonError("Add at least 3 items so Mirra can find what's missing.", 422);

  const prompt = `Analyze this wardrobe and find the 4-6 highest-impact missing pieces — items that would unlock the most new outfits and fill real gaps for their lifestyle. Prefer versatile basics before statement pieces.

About them:
${profileContext(profile as Profile | null)}

Closet (id | name | category | colors | formality | seasons | status | wear):
${closetContext(closet)}

For each gap estimate "unlocks" = how many new complete outfits it enables with what they own, and list up to 4 closet ids it pairs with.
Reply with ONLY JSON: {"summary":"one or two sentences about the closet's balance","gaps":[{"name":"generic description, no brands","category":"top|bottom|outerwear|shoes|dress|accessory","color":"#hex","why":"one sentence","unlocks":0,"pairs_with":["id"],"priority":"high|medium|low"}]}`;

  const ai = await aiJSON(schema, [{ role: "user", content: prompt }], { model: TEXT_MODEL, temperature: 0.4, maxTokens: 2000 });
  const ids = new Set(closet.map((c) => c.id));
  return NextResponse.json({
    summary: ai.summary,
    gaps: ai.gaps.slice(0, 6).map((g) => ({ ...g, color: normalizeHex(g.color) ?? "#888888", pairs_with: g.pairs_with.filter((i) => ids.has(i)).slice(0, 4) })),
  });
});

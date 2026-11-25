import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJSON, TEXT_MODEL } from "@/lib/ai";
import { apiHandler, jsonError } from "@/lib/api";
import { closetContext, loadClosetLines, profileContext } from "@/lib/context";
import type { Profile } from "@/lib/types";

export const maxDuration = 60;

const body = z.object({ code: z.string().trim().min(2).max(200) });
const schema = z.object({
  title: z.string().max(80).catch("Dress code"),
  meaning: z.string().max(600).catch(""),
  do: z.array(z.string().max(160)).catch([]),
  dont: z.array(z.string().max(160)).catch([]),
  formality: z.coerce.number().int().min(1).max(5).catch(3),
  outfit: z.object({ item_ids: z.array(z.string()).catch([]), why: z.string().max(300).catch("") }).catch({ item_ids: [], why: "" }),
  missing: z.array(z.string().max(120)).catch([]),
});

/** Dress code decoder: explain an invitation's dress code and build a look from the closet. */
export const POST = apiHandler("dresscode", { max: 10, windowMs: 60_000 }, async ({ supabase, user }, req) => {
  const p = body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return jsonError("Describe the dress code or event.");
  const [{ data: profile }, closet] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    loadClosetLines(supabase),
  ]);

  const prompt = `Decode this dress code / event description: "${p.data.code}"
Explain what it means in plain language, list concrete dos and don'ts, rate formality 1-5, then build the best outfit from the closet (exact ids, clean items preferred). List anything missing from the closet that the dress code really needs.

About them:
${profileContext(profile as Profile | null)}
Closet (id | name | category | colors | formality | seasons | status | wear):
${closetContext(closet) || "(empty)"}

Reply with ONLY JSON: {"title":"e.g. Cocktail attire","meaning":"2-3 sentences","do":["..."],"dont":["..."],"formality":3,"outfit":{"item_ids":["..."],"why":"..."},"missing":["..."]}`;

  const ai = await aiJSON(schema, [{ role: "user", content: prompt }], { model: TEXT_MODEL, temperature: 0.4, maxTokens: 1500 });
  const ids = new Set(closet.map((c) => c.id));
  return NextResponse.json({
    ...ai,
    do: ai.do.slice(0, 5),
    dont: ai.dont.slice(0, 5),
    missing: ai.missing.slice(0, 4),
    outfit: { ...ai.outfit, item_ids: ai.outfit.item_ids.filter((i) => ids.has(i)).slice(0, 8) },
  });
});

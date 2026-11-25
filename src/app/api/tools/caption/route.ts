import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJSON, TEXT_MODEL } from "@/lib/ai";
import { apiHandler, jsonError } from "@/lib/api";

export const maxDuration = 30;

const body = z.object({ fitCheckId: z.string().uuid(), vibe: z.enum(["chill", "funny", "confident", "minimal"]).catch("chill") });
const schema = z.object({
  captions: z.array(z.string().max(220)).catch([]),
  hashtags: z.array(z.string().max(40)).catch([]),
});

/** Generate social captions for a Fit Check. */
export const POST = apiHandler("caption", { max: 15, windowMs: 60_000 }, async ({ supabase }, req) => {
  const p = body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return jsonError("Invalid request.");
  const { data } = await supabase.from("fit_checks").select("headline, verdict, occasion, tips").eq("id", p.data.fitCheckId).maybeSingle();
  if (!data) return jsonError("Fit Check not found.", 404);

  const prompt = `Write 4 short social media captions (Instagram/TikTok) for someone posting their outfit.
Vibe: ${p.data.vibe}. Occasion: ${data.occasion ?? "everyday"}. Stylist summary of the look: ${data.headline ?? ""} — ${data.verdict ?? ""}
Rules: under 120 characters each, natural and not cringe, at most one emoji each, no hashtags inside captions, never mention scores or AI.
Also give 6 relevant lowercase hashtags (without #).
Reply with ONLY JSON: {"captions":["..."],"hashtags":["..."]}`;

  const ai = await aiJSON(schema, [{ role: "user", content: prompt }], { model: TEXT_MODEL, temperature: 0.9, maxTokens: 600 });
  return NextResponse.json({
    captions: ai.captions.slice(0, 4),
    hashtags: ai.hashtags.map((h) => h.replace(/[^a-z0-9_]/gi, "").toLowerCase()).filter(Boolean).slice(0, 8),
  });
});

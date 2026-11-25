import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJSON, imagePart, textPart, VISION_MODEL } from "@/lib/ai";
import { apiHandler, jsonError, readImage } from "@/lib/api";
import { closetContext, loadClosetLines, profileContext, SAFETY_RULES } from "@/lib/context";
import { normalizeHex } from "@/lib/colors";
import type { Profile } from "@/lib/types";

export const maxDuration = 60;

const score = z.coerce.number().min(0).max(100).transform(Math.round);

const resultSchema = z.object({
  photo_ok: z.boolean().catch(true),
  issue: z.string().max(200).nullable().catch(null),
  headline: z.string().max(80).catch("Your fit, reviewed"),
  verdict: z.string().max(400).catch(""),
  breakdown: z.object({
    color_harmony: score.catch(70),
    fit_proportion: score.catch(70),
    style_cohesion: score.catch(70),
    occasion_match: score.catch(70),
    trend_factor: score.catch(70),
  }),
  total: score.optional().catch(undefined),
  tips: z
    .array(
      z.object({
        title: z.string().max(80),
        detail: z.string().max(300),
        kind: z.enum(["color", "fit", "swap", "styling", "accessory"]).catch("styling"),
        item_id: z.string().nullable().optional().catch(null),
        color: z.string().nullable().optional().catch(null),
      }),
    )
    .catch([])
    .transform((t) => t.slice(0, 5)),
});

const MODES = {
  honest: "Voice: a warm but honest professional stylist. Balanced praise and critique.",
  hype: "Voice: an enthusiastic hype friend. Lead with what works, frame fixes as level-ups. Scores stay truthful.",
  roast:
    "Voice: a playful roast comedian for the verdict and headline — witty, cheeky, about the CLOTHES only, never mean about the person. Tips stay genuinely useful. Scores stay truthful.",
} as const;

const WEIGHTS = { color_harmony: 0.25, fit_proportion: 0.25, style_cohesion: 0.2, occasion_match: 0.2, trend_factor: 0.1 };

export const POST = apiHandler("fitcheck", { max: 8, windowMs: 60_000 }, async ({ supabase, user }, req) => {
  const form = await req.formData();
  const { buf, type, dataUrl } = await readImage(form);
  const mode = z.enum(["honest", "hype", "roast"]).catch("honest").parse(form.get("mode"));
  const occasion = String(form.get("occasion") ?? "").slice(0, 60) || null;
  const virtual = form.get("virtual") === "1";

  const [{ data: profile }, closet] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    loadClosetLines(supabase),
  ]);

  const prompt = `You are Mirra, an expert personal stylist rating an outfit${virtual ? " shown as a flat-lay collage of clothing cutouts (judge the combination, not how it is worn)" : " in a photo"}.
${SAFETY_RULES}
${MODES[mode]}

About the wearer:
${profileContext(profile as Profile | null)}
Occasion: ${occasion ?? "everyday / not specified"}

Their closet (id | name | category | colors | formality | seasons | status | wear):
${closetContext(closet, 120) || "(empty)"}

Score each category 0-100 (be calibrated: 50 = fine but forgettable, 70 = good, 85 = great, 95+ = exceptional):
- color_harmony: do the colors work together and with their personal palette
- fit_proportion: garment fit, silhouette balance, lengths, tucks, layering
- style_cohesion: do the pieces belong to one coherent style
- occasion_match: suitability for the occasion
- trend_factor: current vs dated (timeless pieces can still score well)

Give 3-5 tips, most impactful first. When suggesting a swap from their closet, set "item_id" to that exact id from the list and kind "swap". When suggesting a color, set "color" to a hex code.
If the photo is unusable (no outfit visible, extremely dark/blurry), set photo_ok false and explain in "issue".

Reply with ONLY JSON:
{"photo_ok":true,"issue":null,"headline":"short punchy title (max 8 words)","verdict":"2-3 sentence overall take","breakdown":{"color_harmony":0,"fit_proportion":0,"style_cohesion":0,"occasion_match":0,"trend_factor":0},"total":0,"tips":[{"title":"","detail":"","kind":"color|fit|swap|styling|accessory","item_id":null,"color":null}]}`;

  const ai = await aiJSON(resultSchema, [{ role: "user", content: [textPart(prompt), imagePart(dataUrl)] }], {
    model: VISION_MODEL,
    temperature: mode === "roast" ? 0.7 : 0.4,
    maxTokens: 1800,
  });

  if (!ai.photo_ok) return jsonError(ai.issue ?? "Couldn't see an outfit in that photo — try a full-body shot in good light.", 422);

  const b = ai.breakdown;
  const weighted = Math.round(Object.entries(WEIGHTS).reduce((s, [k, w]) => s + b[k as keyof typeof b] * w, 0));
  // Trust the model's total only if it's close to the weighted breakdown
  const total = ai.total != null && Math.abs(ai.total - weighted) <= 6 ? ai.total : weighted;

  const ids = new Set(closet.map((c) => c.id));
  const tips = ai.tips.map((t) => ({
    ...t,
    item_id: t.item_id && ids.has(t.item_id) ? t.item_id : null,
    color: t.color ? normalizeHex(t.color) : null,
  }));

  const id = crypto.randomUUID();
  const photo_path = `${user.id}/${id}.${type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"}`;
  const up = await supabase.storage.from("fit-checks").upload(photo_path, buf, { contentType: type });
  if (up.error) return jsonError(`Couldn't save the photo: ${up.error.message}`, 500);

  const { error } = await supabase.from("fit_checks").insert({
    id,
    user_id: user.id,
    photo_path,
    total_score: total,
    breakdown: b,
    tips,
    mode,
    occasion,
    headline: ai.headline,
    verdict: ai.verdict,
  });
  if (error) {
    await supabase.storage.from("fit-checks").remove([photo_path]);
    return jsonError(`Couldn't save the result: ${error.message}`, 500);
  }

  return NextResponse.json({ id });
});

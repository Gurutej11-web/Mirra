import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJSON, imagePart, textPart, VISION_MODEL } from "@/lib/ai";
import { apiHandler, readImage } from "@/lib/api";
import { profileContext, SAFETY_RULES } from "@/lib/context";
import type { Profile } from "@/lib/types";

export const maxDuration = 60;

const schema = z.object({
  winner: z.enum(["A", "B", "tie"]).catch("tie"),
  confidence: z.coerce.number().min(0).max(100).catch(60),
  headline: z.string().max(120).catch(""),
  a: z.object({ score: z.coerce.number().min(0).max(100).catch(70), pros: z.array(z.string().max(160)).catch([]), cons: z.array(z.string().max(160)).catch([]) }),
  b: z.object({ score: z.coerce.number().min(0).max(100).catch(70), pros: z.array(z.string().max(160)).catch([]), cons: z.array(z.string().max(160)).catch([]) }),
  tip: z.string().max(300).catch(""),
});

/** "Which one?" — compare two outfit photos for an occasion. */
export const POST = apiHandler("compare", { max: 8, windowMs: 60_000 }, async ({ supabase, user }, req) => {
  const form = await req.formData();
  const a = await readImage(form, "a");
  const b = await readImage(form, "b");
  const occasion = String(form.get("occasion") ?? "").slice(0, 80) || "everyday";
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  const prompt = `Two outfit options are shown: the FIRST image is option A, the SECOND image is option B. The wearer is going to: ${occasion}.
${SAFETY_RULES}
About the wearer:
${profileContext(profile as Profile | null)}
Pick the better outfit for the occasion and explain briefly. Scores 0-100 (calibrated: 70 good, 85 great).
Reply with ONLY JSON: {"winner":"A|B|tie","confidence":0-100,"headline":"short verdict","a":{"score":0,"pros":["..."],"cons":["..."]},"b":{"score":0,"pros":["..."],"cons":["..."]},"tip":"one tip to make the winner even better"}`;

  const ai = await aiJSON(schema, [{ role: "user", content: [textPart(prompt), imagePart(a.dataUrl), imagePart(b.dataUrl)] }], {
    model: VISION_MODEL,
    temperature: 0.3,
    maxTokens: 1200,
  });
  const clip = (x: typeof ai.a) => ({ score: Math.round(x.score), pros: x.pros.slice(0, 3), cons: x.cons.slice(0, 3) });
  return NextResponse.json({ ...ai, confidence: Math.round(ai.confidence), a: clip(ai.a), b: clip(ai.b) });
});

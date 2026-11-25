import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJSON, imagePart, textPart, VISION_MODEL } from "@/lib/ai";
import { apiHandler, readImage } from "@/lib/api";
import { aiItemSchema } from "@/lib/item-schema";
import { CATEGORIES } from "@/lib/types";

export const maxDuration = 60;

const box = z
  .object({
    x1: z.coerce.number(),
    y1: z.coerce.number(),
    x2: z.coerce.number(),
    y2: z.coerce.number(),
  })
  .transform((b) => {
    const c = (n: number) => Math.max(0, Math.min(1000, n));
    const x1 = c(Math.min(b.x1, b.x2)), x2 = c(Math.max(b.x1, b.x2));
    const y1 = c(Math.min(b.y1, b.y2)), y2 = c(Math.max(b.y1, b.y2));
    return { x1, y1, x2, y2 };
  })
  .refine((b) => b.x2 - b.x1 > 20 && b.y2 - b.y1 > 20);

const schema = z.object({
  person_found: z.boolean().catch(true),
  issue: z.string().nullable().catch(null),
  items: z
    .array(z.object({ box }).and(aiItemSchema))
    .catch([])
    .transform((a) => a.slice(0, 8)),
});

const PROMPT = `Find every distinct clothing item and accessory the person in this photo is wearing (tops, bottoms, outerwear, shoes, dresses, bags, hats, watches, etc.).
For each item return a tight bounding box using coordinates normalized to 0-1000 relative to the image width and height (x1,y1 = top-left, x2,y2 = bottom-right).
Reply with ONLY JSON:
{"person_found": boolean, "issue": null or a short reason if the photo is unusable (too dark, blurry, no person),
 "items": [{"box":{"x1":0,"y1":0,"x2":0,"y2":0},"name":"Navy crewneck sweater","category":"${CATEGORIES.join("|")}","subcategory":"sweater","colors":["#hex"],"pattern":"solid","material":"wool","formality":2,"seasons":["fall","winter"],"tags":["knit"],"brand":null}]}`;

export const POST = apiHandler("detect", { max: 10, windowMs: 60_000 }, async (_ctx, req) => {
  const form = await req.formData();
  const { dataUrl } = await readImage(form);
  const result = await aiJSON(schema, [{ role: "user", content: [textPart(PROMPT), imagePart(dataUrl)] }], {
    model: VISION_MODEL,
    temperature: 0.1,
    maxTokens: 2500,
  });
  return NextResponse.json(result);
});

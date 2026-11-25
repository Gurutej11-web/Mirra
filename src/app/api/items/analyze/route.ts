import { NextResponse } from "next/server";
import { aiJSON, imagePart, textPart, VISION_MODEL } from "@/lib/ai";
import { apiHandler, readImage } from "@/lib/api";
import { aiItemSchema, TAG_PROMPT } from "@/lib/item-schema";
import { removeBackground } from "@/lib/removebg";

export const maxDuration = 60;

/**
 * POST multipart { image, cutout?: "1"|"0", tags?: "1"|"0" }
 * → { tags, cutout: dataURL|null, cutoutReason? }
 */
export const POST = apiHandler("analyze", { max: 30, windowMs: 60_000 }, async (_ctx, req) => {
  const form = await req.formData();
  const { buf, type, dataUrl } = await readImage(form);
  const wantCutout = form.get("cutout") !== "0";
  const wantTags = form.get("tags") !== "0";

  const [tags, cut] = await Promise.all([
    wantTags
      ? aiJSON(aiItemSchema, [{ role: "user", content: [textPart(TAG_PROMPT), imagePart(dataUrl)] }], {
          model: VISION_MODEL,
          temperature: 0.2,
          maxTokens: 600,
        })
      : Promise.resolve(null),
    wantCutout ? removeBackground(buf, type) : Promise.resolve({ png: null, reason: "skipped" as const }),
  ]);

  return NextResponse.json({
    tags,
    cutout: cut.png ? `data:image/png;base64,${cut.png.toString("base64")}` : null,
    cutoutReason: cut.png ? undefined : cut.reason,
  });
});

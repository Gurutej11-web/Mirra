import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, jsonError } from "@/lib/api";
import { importProduct } from "@/lib/importer";

export const maxDuration = 30;

const body = z.object({ url: z.string().trim().url().max(1000) });

/** POST { url } → { name, price, brand, source_url, image: dataURL|null } */
export const POST = apiHandler("import", { max: 15, windowMs: 60_000 }, async (_ctx, req) => {
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Paste a full product link starting with https://");
  try {
    const p = await importProduct(parsed.data.url);
    return NextResponse.json({ name: p.name, price: p.price, brand: p.brand, source_url: p.source_url, image: p.image });
  } catch (e) {
    return jsonError((e as Error).message, 422);
  }
});

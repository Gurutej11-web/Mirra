import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, jsonError } from "@/lib/api";
import { parseProduct } from "@/lib/product-parse";
import { safeFetch } from "@/lib/safe-fetch";

export const maxDuration = 30;

const body = z.object({ url: z.string().trim().url().max(1000) });

async function fetchImageDataUrl(src: string) {
  try {
    const img = await safeFetch(src, { maxBytes: 8_000_000, accept: "image/*" });
    const type = img.contentType.split(";")[0];
    return /^image\/(jpeg|png|webp)$/.test(type) ? `data:${type};base64,${img.body.toString("base64")}` : null;
  } catch {
    return null;
  }
}

async function shopifyProduct(raw: string) {
  try {
    const u = new URL(raw);
    const m = u.pathname.match(/^(.*\/products\/[^/]+)/);
    if (!m) return null;
    const res = await safeFetch(`${u.origin}${m[1]}.js`, { accept: "application/json", maxBytes: 2_000_000 });
    if (!res.contentType.includes("json")) return null;
    const p = JSON.parse(res.body.toString("utf8"));
    const imgSrc: string | undefined = p.featured_image ?? p.images?.[0];
    if (!p.title || !imgSrc) return null;
    const image = await fetchImageDataUrl(new URL(imgSrc.startsWith("//") ? `https:${imgSrc}` : imgSrc, u.origin).toString());
    if (!image) return null;
    return {
      name: String(p.title).slice(0, 80),
      price: typeof p.price === "number" && p.price > 0 ? p.price / 100 : null,
      brand: p.vendor ? String(p.vendor).slice(0, 40) : null,
      source_url: u.toString(),
      image,
    };
  } catch {
    return null;
  }
}

/** POST { url } → { name, price, brand, source_url, image: dataURL|null } */
export const POST = apiHandler("import", { max: 15, windowMs: 60_000 }, async (_ctx, req) => {
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Paste a full product link starting with https://");

  // Shopify stores expose clean product JSON at /products/<handle>.js
  const shop = await shopifyProduct(parsed.data.url);
  if (shop) return NextResponse.json(shop);

  let page;
  try {
    page = await safeFetch(parsed.data.url);
  } catch (e) {
    return jsonError(
      `${(e as Error).message} Some stores block automatic imports — try uploading a screenshot instead.`,
      422,
    );
  }

  let product;
  let image: string | null = null;
  if (page.contentType.startsWith("image/")) {
    product = { name: null, price: null, brand: null, image: page.url };
    image = `data:${page.contentType.split(";")[0]};base64,${page.body.toString("base64")}`;
  } else {
    product = parseProduct(page.body.toString("utf8"), page.url);
    if (product.image) image = await fetchImageDataUrl(product.image);
  }

  if (!image && !product.name) {
    return jsonError(
      "Couldn't find a product on that page. Some stores block automatic imports — try uploading a screenshot instead.",
      422,
    );
  }

  return NextResponse.json({
    name: product.name,
    price: product.price,
    brand: product.brand,
    source_url: page.url,
    image,
  });
});

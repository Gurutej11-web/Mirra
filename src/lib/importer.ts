import "server-only";
import { parseProduct } from "@/lib/product-parse";
import { safeFetch } from "@/lib/safe-fetch";

export type Imported = {
  name: string | null;
  price: number | null;
  brand: string | null;
  source_url: string;
  image: string | null; // data URL
  image_src: string | null; // remote URL (for wishlist display)
};

const BLOCKED_HINT = "Some stores block automatic imports — try uploading a screenshot instead.";

export async function fetchImageDataUrl(src: string) {
  try {
    const img = await safeFetch(src, { maxBytes: 8_000_000, accept: "image/*" });
    const type = img.contentType.split(";")[0];
    return /^image\/(jpeg|png|webp)$/.test(type) ? `data:${type};base64,${img.body.toString("base64")}` : null;
  } catch {
    return null;
  }
}

async function shopifyProduct(raw: string): Promise<Imported | null> {
  try {
    const u = new URL(raw);
    const m = u.pathname.match(/^(.*\/products\/[^/]+)/);
    if (!m) return null;
    const res = await safeFetch(`${u.origin}${m[1]}.js`, { accept: "application/json", maxBytes: 2_000_000 });
    if (!res.contentType.includes("json")) return null;
    const p = JSON.parse(res.body.toString("utf8"));
    const imgSrc: string | undefined = p.featured_image ?? p.images?.[0];
    if (!p.title || !imgSrc) return null;
    const abs = new URL(imgSrc.startsWith("//") ? `https:${imgSrc}` : imgSrc, u.origin).toString();
    const image = await fetchImageDataUrl(abs);
    if (!image) return null;
    return {
      name: String(p.title).slice(0, 80),
      price: typeof p.price === "number" && p.price > 0 ? p.price / 100 : null,
      brand: p.vendor ? String(p.vendor).slice(0, 40) : null,
      source_url: u.toString(),
      image,
      image_src: abs,
    };
  } catch {
    return null;
  }
}

/** Import product info + image from a store URL. Throws Error with a user-facing message. */
export async function importProduct(url: string): Promise<Imported> {
  const shop = await shopifyProduct(url);
  if (shop) return shop;

  let page;
  try {
    page = await safeFetch(url);
  } catch (e) {
    throw new Error(`${(e as Error).message} ${BLOCKED_HINT}`);
  }

  if (page.contentType.startsWith("image/")) {
    const type = page.contentType.split(";")[0];
    return {
      name: null,
      price: null,
      brand: null,
      source_url: page.url,
      image: /^image\/(jpeg|png|webp)$/.test(type) ? `data:${type};base64,${page.body.toString("base64")}` : null,
      image_src: page.url,
    };
  }

  const product = parseProduct(page.body.toString("utf8"), page.url);
  const image = product.image ? await fetchImageDataUrl(product.image) : null;
  if (!image && !product.name) throw new Error(`Couldn't find a product on that page. ${BLOCKED_HINT}`);
  return { name: product.name, price: product.price, brand: product.brand, source_url: page.url, image, image_src: product.image };
}

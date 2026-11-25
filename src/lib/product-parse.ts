/** Pull product info (name, image, price, brand) out of a store page's HTML. */

export type ProductInfo = {
  name: string | null;
  image: string | null;
  price: number | null;
  brand: string | null;
};

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function meta(html: string, key: string) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${key}["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decode(m[1] ?? m[2]) : null;
}

function toPrice(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 && n < 100000 ? n : null;
}

type JsonLd = Record<string, unknown>;

function findProduct(node: unknown): JsonLd | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findProduct(n);
      if (f) return f;
    }
    return null;
  }
  const obj = node as JsonLd;
  const type = obj["@type"];
  if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return obj;
  if (obj["@graph"]) return findProduct(obj["@graph"]);
  return null;
}

export function parseProduct(html: string, pageUrl: string): ProductInfo {
  const info: ProductInfo = { name: null, image: null, price: null, brand: null };

  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const product = findProduct(JSON.parse(m[1].trim()));
      if (!product) continue;
      info.name ??= typeof product.name === "string" ? decode(product.name) : null;
      const img = product.image;
      const firstImg = Array.isArray(img) ? img[0] : img;
      info.image ??=
        typeof firstImg === "string" ? firstImg : (firstImg as JsonLd | undefined)?.url as string | null ?? null;
      const brand = product.brand;
      info.brand ??= typeof brand === "string" ? brand : ((brand as JsonLd | undefined)?.name as string) ?? null;
      const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
      const o = offers as JsonLd | undefined;
      info.price ??= toPrice(o?.price ?? o?.lowPrice ?? (o?.priceSpecification as JsonLd | undefined)?.price);
      break;
    } catch {
      // ignore malformed JSON-LD
    }
  }

  info.name ??= meta(html, "og:title") ?? meta(html, "twitter:title") ?? (html.match(/<title>([^<]+)<\/title>/i)?.[1] ? decode(html.match(/<title>([^<]+)<\/title>/i)![1]) : null);
  info.image ??= meta(html, "og:image:secure_url") ?? meta(html, "og:image") ?? meta(html, "twitter:image");
  info.price ??= toPrice(meta(html, "product:price:amount") ?? meta(html, "og:price:amount") ?? meta(html, "price"));
  info.brand ??= meta(html, "product:brand") ?? meta(html, "og:site_name");

  if (info.image) {
    try {
      info.image = new URL(info.image, pageUrl).toString();
    } catch {
      info.image = null;
    }
  }
  if (info.name) info.name = info.name.split(/\s[|–-]\s/)[0].slice(0, 80);
  return info;
}

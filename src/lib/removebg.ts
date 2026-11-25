import "server-only";

/**
 * Remove an image background with remove.bg.
 * Uses the free "preview" size (up to 0.25 MP). Returns null when not configured,
 * out of credits, or on any error — callers fall back to the original photo.
 */
export async function removeBackground(buf: Buffer, type: string): Promise<{ png: Buffer; reason?: never } | { png: null; reason: string }> {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) return { png: null, reason: "not_configured" };

  const form = new FormData();
  form.append("image_file", new Blob([new Uint8Array(buf)], { type }), "upload");
  form.append("size", "preview");
  form.append("format", "png");
  form.append("crop", "true");
  form.append("crop_margin", "4%");

  try {
    const res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": key },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("[remove.bg]", res.status, text.slice(0, 300));
      return { png: null, reason: res.status === 402 ? "out_of_credits" : res.status === 400 ? "no_subject" : "error" };
    }
    return { png: Buffer.from(await res.arrayBuffer()) };
  } catch (e) {
    console.warn("[remove.bg] failed", e);
    return { png: null, reason: "error" };
  }
}

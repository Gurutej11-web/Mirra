import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIError, rateLimit } from "@/lib/ai";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap an API handler: auth, rate limit, and friendly error responses. */
export function apiHandler(
  name: string,
  limit: { max: number; windowMs: number },
  fn: (ctx: Awaited<ReturnType<typeof requireUser>> & { user: NonNullable<Awaited<ReturnType<typeof requireUser>>["user"]> }, req: Request) => Promise<Response>,
) {
  return async (req: Request) => {
    try {
      const ctx = await requireUser();
      if (!ctx.user) return jsonError("Please sign in again.", 401);
      if (!rateLimit(`${name}:${ctx.user.id}`, limit.max, limit.windowMs))
        return jsonError("You're going a little fast — wait a moment and try again.", 429);
      return await fn({ supabase: ctx.supabase, user: ctx.user }, req);
    } catch (e) {
      if (e instanceof AIError) return jsonError(e.message, e.status);
      console.error(`[api:${name}]`, e);
      return jsonError("Something went wrong. Please try again.", 500);
    }
  };
}

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Read an uploaded image from form data and return a data URL. */
export async function readImage(form: FormData, field = "image") {
  const file = form.get(field);
  if (!(file instanceof Blob)) throw new AIError("No image was uploaded.", 400);
  if (file.size > MAX_IMAGE_BYTES) throw new AIError("That image is too large (max 8 MB).", 413);
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new AIError("Please upload a JPG, PNG or WebP image.", 415);
  const buf = Buffer.from(await file.arrayBuffer());
  return { buf, type: file.type, dataUrl: `data:${file.type};base64,${buf.toString("base64")}` };
}

"use client";

import { createClient } from "@/lib/supabase/client";

/** Upload a blob to a private bucket under the user's folder. Returns the storage path. */
export async function uploadToBucket(bucket: "closet" | "fit-checks" | "avatars", userId: string, name: string, blob: Blob) {
  const supabase = createClient();
  const path = `${userId}/${name}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

/** POST a form to one of our API routes and return the JSON (throws with a friendly message). */
export async function postForm<T>(url: string, form: FormData): Promise<T> {
  const res = await fetch(url, { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
  return json as T;
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
  return json as T;
}

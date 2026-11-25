import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Item, ItemWithImage } from "@/lib/types";

const TTL = 60 * 60; // 1 hour

/** Attach signed image URLs (cutout preferred) to closet items in one request. */
export async function withImages(supabase: SupabaseClient, items: Item[]): Promise<ItemWithImage[]> {
  const paths = items.map((i) => i.cutout_path ?? i.image_path).filter((p): p is string => !!p);
  if (!paths.length) return items.map((i) => ({ ...i, image_url: null }));
  const { data } = await supabase.storage.from("closet").createSignedUrls(paths, TTL);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return items.map((i) => {
    const p = i.cutout_path ?? i.image_path;
    return { ...i, image_url: p ? (map.get(p) ?? null) : null };
  });
}

export async function signedUrl(supabase: SupabaseClient, bucket: string, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, TTL);
  return data?.signedUrl ?? null;
}

export async function signedUrls(supabase: SupabaseClient, bucket: string, paths: string[]) {
  if (!paths.length) return new Map<string, string>();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, TTL);
  return new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl]));
}

/** Fetch all non-archived items for the current user with images. */
export async function getCloset(supabase: SupabaseClient, { includeArchived = false } = {}) {
  let q = supabase.from("items").select("*").order("created_at", { ascending: false });
  if (!includeArchived) q = q.eq("archived", false);
  const { data, error } = await q;
  if (error) return { items: [] as ItemWithImage[], error: error.message };
  return { items: await withImages(supabase, (data ?? []) as Item[]), error: null };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { itemInputSchema, type ItemInput } from "@/lib/item-schema";
import { ITEM_STATUSES } from "@/lib/types";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

function done(paths: string[] = []) {
  revalidatePath("/closet");
  for (const p of paths) revalidatePath(p);
}

const uuid = z.string().uuid();
const pathRe = /^[0-9a-f-]{36}\/[\w.-]+$/i;

/** Insert an item whose images were already uploaded to storage by the browser. */
export async function createItem(input: ItemInput & { id: string; image_path: string | null; cutout_path: string | null }) {
  const parsed = itemInputSchema.safeParse(input);
  if (!parsed.success || !uuid.safeParse(input.id).success) return { error: "Some fields look invalid." };
  const { supabase, user } = await ctx();
  for (const p of [input.image_path, input.cutout_path]) {
    if (p && (!pathRe.test(p) || !p.startsWith(`${user.id}/`))) return { error: "Invalid image path." };
  }
  const { error } = await supabase.from("items").insert({
    ...parsed.data,
    id: input.id,
    user_id: user.id,
    image_path: input.image_path,
    cutout_path: input.cutout_path,
  });
  if (error) return { error: error.message };
  done();
  return { ok: true, id: input.id };
}

export async function updateItem(id: string, input: ItemInput) {
  const parsed = itemInputSchema.safeParse(input);
  if (!parsed.success || !uuid.safeParse(id).success) return { error: "Some fields look invalid." };
  const { supabase } = await ctx();
  const { error } = await supabase.from("items").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };
  done([`/closet/${id}`]);
  return { ok: true };
}

export async function deleteItems(ids: string[]) {
  if (!z.array(uuid).max(500).safeParse(ids).success) return { error: "Invalid selection." };
  const { supabase } = await ctx();
  const { data: rows } = await supabase.from("items").select("image_path, cutout_path").in("id", ids);
  const { error } = await supabase.from("items").delete().in("id", ids);
  if (error) return { error: error.message };
  const files = (rows ?? []).flatMap((r) => [r.image_path, r.cutout_path]).filter((p): p is string => !!p);
  if (files.length) await supabase.storage.from("closet").remove(files);
  done();
  return { ok: true };
}

const patchSchema = z
  .object({
    status: z.enum(ITEM_STATUSES),
    favorite: z.boolean(),
    archived: z.boolean(),
  })
  .partial();

export async function patchItems(ids: string[], patch: z.infer<typeof patchSchema>) {
  const p = patchSchema.safeParse(patch);
  if (!p.success || !z.array(uuid).min(1).max(500).safeParse(ids).success) return { error: "Invalid update." };
  const { supabase } = await ctx();
  const { error } = await supabase.from("items").update(p.data).in("id", ids);
  if (error) return { error: error.message };
  done(ids.length === 1 ? [`/closet/${ids[0]}`] : []);
  return { ok: true };
}

export async function addTags(ids: string[], tags: string[]) {
  const cleaned = tags.map((t) => t.trim().toLowerCase().slice(0, 24)).filter(Boolean).slice(0, 5);
  if (!cleaned.length || !z.array(uuid).min(1).max(500).safeParse(ids).success) return { error: "Invalid tags." };
  const { supabase } = await ctx();
  const { data } = await supabase.from("items").select("id, tags").in("id", ids);
  for (const row of data ?? []) {
    const merged = Array.from(new Set([...(row.tags ?? []), ...cleaned])).slice(0, 10);
    await supabase.from("items").update({ tags: merged }).eq("id", row.id);
  }
  done();
  return { ok: true };
}

/** Log that items were worn (bumps counters, marks washables dirty). */
export async function logWear(itemIds: string[], outfitId?: string | null, day?: string) {
  if (!z.array(uuid).min(1).max(20).safeParse(itemIds).success) return { error: "Invalid items." };
  const { supabase } = await ctx();
  const { data, error } = await supabase.rpc("log_wear", {
    p_item_ids: itemIds,
    p_outfit_id: outfitId ?? null,
    p_day: day ?? new Date().toISOString().slice(0, 10),
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, logId: data as string };
}

export async function undoWear(logId: string) {
  if (!uuid.safeParse(logId).success) return { error: "Invalid log." };
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("unlog_wear", { p_log_id: logId });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

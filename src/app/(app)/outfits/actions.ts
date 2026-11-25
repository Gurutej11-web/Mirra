"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

const uuid = z.string().uuid();
const layer = z.object({
  x: z.number().min(-50).max(150),
  y: z.number().min(-50).max(150),
  scale: z.number().min(0.2).max(4),
  rotate: z.number().min(-180).max(180).optional(),
  z: z.number().int().min(0).max(20).optional(),
});

const outfitSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(60),
  item_ids: z.array(uuid).min(1).max(12),
  layout: z.record(z.string(), layer),
  occasion: z.string().trim().max(40).nullable(),
  lookbook_id: uuid.nullable(),
  new_lookbook: z.string().trim().max(40).optional(),
});

export async function saveOutfit(input: z.infer<typeof outfitSchema>) {
  const p = outfitSchema.safeParse(input);
  if (!p.success) return { error: "Outfit needs a name and at least one item." };
  const { supabase, user } = await ctx();
  let lookbook_id = p.data.lookbook_id;
  if (p.data.new_lookbook) {
    const { data, error } = await supabase
      .from("lookbooks")
      .insert({ user_id: user.id, name: p.data.new_lookbook })
      .select("id")
      .single();
    if (error) return { error: error.message };
    lookbook_id = data.id;
  }
  const row = {
    name: p.data.name,
    item_ids: p.data.item_ids,
    layout: p.data.layout,
    occasion: p.data.occasion,
    lookbook_id,
  };
  const { data, error } = p.data.id
    ? await supabase.from("outfits").update(row).eq("id", p.data.id).select("id").single()
    : await supabase.from("outfits").insert({ ...row, user_id: user.id }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/outfits");
  return { ok: true, id: data.id as string };
}

export async function deleteOutfit(id: string) {
  if (!uuid.safeParse(id).success) return { error: "Invalid outfit." };
  const { supabase } = await ctx();
  const { error } = await supabase.from("outfits").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/outfits");
  return { ok: true };
}

export async function patchOutfit(id: string, patch: { name?: string; favorite?: boolean; lookbook_id?: string | null }) {
  const p = z
    .object({ name: z.string().trim().min(1).max(60), favorite: z.boolean(), lookbook_id: uuid.nullable() })
    .partial()
    .safeParse(patch);
  if (!p.success || !uuid.safeParse(id).success) return { error: "Invalid update." };
  const { supabase } = await ctx();
  const { error } = await supabase.from("outfits").update(p.data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/outfits");
  revalidatePath(`/outfits/${id}`);
  return { ok: true };
}

export async function createLookbook(name: string) {
  const n = z.string().trim().min(1).max(40).safeParse(name);
  if (!n.success) return { error: "Give the lookbook a name." };
  const { supabase, user } = await ctx();
  const { data, error } = await supabase.from("lookbooks").insert({ user_id: user.id, name: n.data }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/outfits");
  return { ok: true, id: data.id as string };
}

export async function deleteLookbook(id: string) {
  if (!uuid.safeParse(id).success) return { error: "Invalid lookbook." };
  const { supabase } = await ctx();
  const { error } = await supabase.from("lookbooks").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/outfits");
  return { ok: true };
}

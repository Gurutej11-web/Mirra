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
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function setPlan(d: string, outfitId: string | null, note?: string | null) {
  if (!day.safeParse(d).success || (outfitId && !uuid.safeParse(outfitId).success)) return { error: "Invalid plan." };
  const { supabase, user } = await ctx();
  if (!outfitId && !note) {
    const { error } = await supabase.from("planner_entries").delete().eq("day", d);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("planner_entries")
      .upsert({ user_id: user.id, day: d, outfit_id: outfitId, note: note?.slice(0, 200) ?? null }, { onConflict: "user_id,day" });
    if (error) return { error: error.message };
  }
  revalidatePath("/planner");
  revalidatePath("/home");
  return { ok: true };
}

/** Save a generated combination as an outfit and plan it on a day. */
export async function planCombo(d: string, itemIds: string[], name: string) {
  if (!day.safeParse(d).success || !z.array(uuid).min(1).max(12).safeParse(itemIds).success) return { error: "Invalid plan." };
  const { supabase, user } = await ctx();
  const { data, error } = await supabase
    .from("outfits")
    .insert({ user_id: user.id, name: name.slice(0, 60) || "Planned outfit", item_ids: itemIds, layout: {} })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return setPlan(d, data.id);
}

const packingSchema = z.object({
  destination: z.string().trim().min(1).max(80),
  start_date: day.nullable(),
  end_date: day.nullable(),
  plan: z.record(z.string(), z.unknown()),
});

export async function savePacking(input: z.infer<typeof packingSchema>) {
  const p = packingSchema.safeParse(input);
  if (!p.success) return { error: "Invalid packing list." };
  const { supabase, user } = await ctx();
  const { data, error } = await supabase.from("packing_lists").insert({ ...p.data, user_id: user.id }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/planner/packing");
  return { ok: true, id: data.id as string };
}

export async function setPackingChecked(id: string, checked: string[]) {
  if (!uuid.safeParse(id).success || !z.array(z.string().max(120)).max(300).safeParse(checked).success) return { error: "Invalid." };
  const { supabase } = await ctx();
  const { error } = await supabase.from("packing_lists").update({ checked }).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deletePacking(id: string) {
  if (!uuid.safeParse(id).success) return { error: "Invalid." };
  const { supabase } = await ctx();
  const { error } = await supabase.from("packing_lists").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/planner/packing");
  return { ok: true };
}

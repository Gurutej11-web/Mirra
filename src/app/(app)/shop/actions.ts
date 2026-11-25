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

const wishSchema = z.object({
  name: z.string().trim().min(1).max(80),
  url: z.string().url().max(1000).nullable(),
  image_url: z.string().max(1000).nullable(), // remote URL or "closet:<path>"
  price: z.number().min(0).max(100000).nullable(),
  match_score: z.number().int().min(0).max(100),
  outfits_unlocked: z.number().int().min(0).max(1000),
  verdict: z.enum(["buy", "maybe", "skip"]),
  analysis: z.object({
    headline: z.string().max(200).optional(),
    reasons: z.array(z.string().max(300)).max(6),
    similar_ids: z.array(z.string().uuid()).max(10),
    pairs_with: z.array(z.string().uuid()).max(10),
  }),
});

export async function addToWishlist(input: z.infer<typeof wishSchema>) {
  const p = wishSchema.safeParse(input);
  if (!p.success) return { error: "Couldn't save that item." };
  const { supabase, user } = await ctx();
  if (p.data.image_url?.startsWith("closet:") && !p.data.image_url.startsWith(`closet:${user.id}/`)) return { error: "Invalid image." };
  if (p.data.image_url && !p.data.image_url.startsWith("closet:") && !/^https?:\/\//.test(p.data.image_url)) return { error: "Invalid image." };
  const { error } = await supabase.from("wishlist").insert({ ...p.data, user_id: user.id });
  if (error) return { error: error.message };
  revalidatePath("/shop");
  return { ok: true };
}

export async function removeFromWishlist(id: string) {
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid." };
  const { supabase } = await ctx();
  const { data } = await supabase.from("wishlist").select("image_url").eq("id", id).maybeSingle();
  const { error } = await supabase.from("wishlist").delete().eq("id", id);
  if (error) return { error: error.message };
  if (data?.image_url?.startsWith("closet:")) await supabase.storage.from("closet").remove([data.image_url.slice(7)]);
  revalidatePath("/shop");
  return { ok: true };
}

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

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

const paletteSchema = z.object({
  season: z.string().max(30),
  undertone: z.enum(["warm", "cool", "neutral"]),
  depth: z.enum(["light", "medium", "deep"]),
  contrast: z.enum(["low", "medium", "high"]),
  skin: hex,
  hair: hex,
  eyes: hex,
  best: z.array(hex).max(12),
  avoid: z.array(hex).max(12),
  metals: z.string().max(40),
  analyzed_at: z.string().max(40),
});

export async function savePalette(palette: z.infer<typeof paletteSchema>) {
  const p = paletteSchema.safeParse(palette);
  if (!p.success) return { error: "Invalid palette." };
  const { supabase, user } = await ctx();
  const { error } = await supabase.from("profiles").update({ palette: p.data }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

const avatarSchema = z.object({
  skin: hex.optional(),
  hair: hex.optional(),
  hairStyle: z.enum(["short", "buzz", "medium", "long", "curly", "bun"]).optional(),
  body: z.enum(["slim", "average", "broad", "curvy"]).optional(),
});

export async function saveAvatar(config: z.infer<typeof avatarSchema>) {
  const p = avatarSchema.safeParse(config);
  if (!p.success) return { error: "Invalid avatar." };
  const { supabase, user } = await ctx();
  const { error } = await supabase.from("profiles").update({ avatar_config: p.data }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/try-on");
  return { ok: true };
}

const settingsSchema = z
  .object({
    display_name: z.string().trim().min(1).max(40),
    roast_mode: z.boolean(),
    hide_scores: z.boolean(),
    units: z.enum(["metric", "imperial"]),
    theme: z.enum(["dark", "light", "system"]),
    location: z.object({ name: z.string().max(80), lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }).nullable(),
  })
  .partial();

export async function saveSettings(patch: z.infer<typeof settingsSchema>) {
  const p = settingsSchema.safeParse(patch);
  if (!p.success) return { error: "Invalid settings." };
  const { supabase, user } = await ctx();
  const { error } = await supabase.from("profiles").update(p.data).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveBudget(amount: number | null) {
  const p = z.number().min(0).max(100000).nullable().safeParse(amount);
  if (!p.success) return { error: "Invalid amount." };
  const { supabase, user } = await ctx();
  const { error } = await supabase.from("profiles").update({ monthly_budget: p.data }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/insights");
  return { ok: true };
}

export async function setTryonPhoto(path: string | null) {
  const { supabase, user } = await ctx();
  if (path && !path.startsWith(`${user.id}/`)) return { error: "Invalid path." };
  const { data: prev } = await supabase.from("profiles").select("tryon_photo_path").eq("id", user.id).single();
  const { error } = await supabase.from("profiles").update({ tryon_photo_path: path }).eq("id", user.id);
  if (error) return { error: error.message };
  if (prev?.tryon_photo_path && prev.tryon_photo_path !== path) {
    await supabase.storage.from("avatars").remove([prev.tryon_photo_path]);
  }
  revalidatePath("/try-on");
  return { ok: true };
}

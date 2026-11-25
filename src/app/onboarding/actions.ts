"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeStyleDNA } from "@/lib/style";

const schema = z.object({
  displayName: z.string().trim().max(40).optional(),
  liked: z.array(z.string()).max(30),
  disliked: z.array(z.string()).max(30),
  occasions: z.array(z.string()).max(10),
  tops: z.string().max(20),
  bottoms: z.string().max(20),
  heightCm: z.number().int().min(90).max(250).nullable(),
  build: z.string().max(20).nullable(),
  favoriteColors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(24),
  bannedColors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(24),
  budget: z.string().max(40).nullable(),
});

export type OnboardingInput = z.infer<typeof schema>;

export async function saveOnboarding(input: OnboardingInput) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Some answers look invalid — please review and try again." };
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const style_dna = computeStyleDNA(d.liked, d.disliked, d.occasions);

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    ...(d.displayName ? { display_name: d.displayName } : {}),
    style_dna,
    fit_prefs: { tops: d.tops, bottoms: d.bottoms },
    height_cm: d.heightCm,
    build: d.build,
    favorite_colors: d.favoriteColors,
    banned_colors: d.bannedColors,
    budget: d.budget,
    onboarded: true,
  });
  if (error) return { error: `Couldn't save your profile: ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: true, styleDna: style_dna };
}

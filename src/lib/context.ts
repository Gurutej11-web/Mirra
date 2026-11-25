import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { colorName } from "@/lib/colors";
import { daysSince } from "@/lib/closet-utils";
import { styleLabel } from "@/lib/style";
import type { Item, Profile } from "@/lib/types";

/** Compact, token-friendly description of the user for AI prompts. */
export function profileContext(p: Profile | null) {
  if (!p) return "No profile yet.";
  const lines = [
    p.style_dna?.primary && `Style: ${styleLabel(p.style_dna.primary)} with ${styleLabel(p.style_dna.secondary)} influence (${p.style_dna.keywords?.join(", ")}).`,
    p.fit_prefs?.tops && `Fit preference: ${p.fit_prefs.tops} tops, ${p.fit_prefs.bottoms} bottoms.`,
    p.palette?.season && `Color season: ${p.palette.season}, ${p.palette.undertone} undertone, ${p.palette.contrast} contrast. Best colors: ${p.palette.best?.map(colorName).join(", ")}. Colors to avoid near the face: ${p.palette.avoid?.map(colorName).join(", ")}.`,
    p.favorite_colors?.length && `Loves: ${p.favorite_colors.map(colorName).join(", ")}.`,
    p.banned_colors?.length && `Never wears: ${p.banned_colors.map(colorName).join(", ")}.`,
    p.style_dna?.occasions?.length && `Dresses for: ${p.style_dna.occasions.join(", ")}.`,
    p.budget && `Budget: ${p.budget}.`,
    p.height_cm && `Height: ${p.height_cm} cm.`,
  ];
  return lines.filter(Boolean).join("\n");
}

export type ClosetLine = Pick<Item, "id" | "name" | "category" | "colors" | "formality" | "seasons" | "status" | "times_worn" | "last_worn" | "subcategory" | "favorite">;

/** One line per item: id|name|category|colors|formality|seasons|status|wear info */
export function closetContext(items: ClosetLine[], max = 150) {
  return items
    .slice(0, max)
    .map((i) =>
      [
        i.id,
        i.name,
        i.subcategory ? `${i.category}/${i.subcategory}` : i.category,
        i.colors.map(colorName).join("+") || "?",
        `f${i.formality ?? 2}`,
        i.seasons.join("/") || "all-year",
        i.status,
        i.times_worn ? `worn ${i.times_worn}x, ${daysSince(i.last_worn)}d ago` : "never worn",
        i.favorite ? "fav" : "",
      ]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");
}

export async function loadClosetLines(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("items")
    .select("id, name, category, subcategory, colors, formality, seasons, status, times_worn, last_worn, favorite")
    .eq("archived", false)
    .order("times_worn", { ascending: false })
    .limit(200);
  return (data ?? []) as ClosetLine[];
}

export const SAFETY_RULES = `Ground rules (never break these):
- Critique ONLY clothing, colors, fit of the garments, styling and grooming choices the person controls. Never comment on body size, weight, shape, attractiveness, age, race, disability or any physical trait.
- Never use shaming language. Even in roast mode, jokes target the clothes and styling choices, never the person.
- If the image is not a photo of clothing or an outfit, say so instead of rating.
- Keep advice concrete and actionable.`;

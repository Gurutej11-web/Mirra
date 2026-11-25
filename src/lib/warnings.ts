/** Weather-aware warnings for a planned outfit. */
import type { Item } from "@/lib/types";

type W = { minC: number; maxC: number; rainChance: number; code: number };

export function outfitWarnings(items: Pick<Item, "name" | "category" | "material" | "colors" | "seasons" | "status">[], w: W | null) {
  const out: string[] = [];
  const dirty = items.filter((i) => i.status !== "clean");
  if (dirty.length) out.push(`${dirty.map((d) => d.name).join(", ")} ${dirty.length > 1 ? "are" : "is"} in the laundry.`);
  if (!w) return out;
  const wet = w.rainChance >= 50 || (w.code >= 51 && w.code <= 82) || w.code >= 95;
  const hasOuter = items.some((i) => i.category === "outerwear");
  if (wet) {
    const delicate = items.filter((i) => /suede|silk|canvas|velvet/i.test(i.material ?? "") || (i.category === "shoes" && /white|cream/i.test(i.name)));
    if (delicate.length) out.push(`Rain likely (${w.rainChance}%) — ${delicate.map((d) => d.name).join(", ")} may not love it.`);
    if (!hasOuter) out.push("Rain likely — add a jacket or bring an umbrella.");
  }
  if (w.maxC < 12 && !hasOuter) out.push(`Cold day (high ${Math.round(w.maxC)}°C) — this has no outer layer.`);
  const summerOnly = items.filter((i) => i.seasons.length && i.seasons.every((s) => s === "summer"));
  if (w.maxC < 15 && summerOnly.length) out.push(`${summerOnly.map((s) => s.name).join(", ")} might be too light for ${Math.round(w.maxC)}°C.`);
  const winterOnly = items.filter((i) => i.seasons.length && i.seasons.every((s) => s === "winter"));
  if (w.minC > 22 && winterOnly.length) out.push(`${winterOnly.map((s) => s.name).join(", ")} could be too warm today.`);
  return out;
}

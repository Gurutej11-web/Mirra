/**
 * Rule-based outfit engine (no AI, instant, free).
 * Powers "goes with", Shuffle, outfit of the day and the try-on suggestions.
 */
import { colorDistance, outfitHarmony, pairScore } from "@/lib/colors";
import { daysSince } from "@/lib/closet-utils";
import type { Item, Season } from "@/lib/types";

type Lite = Pick<Item, "id" | "category" | "colors" | "formality" | "seasons" | "status" | "last_worn" | "times_worn" | "favorite">;

export type EngineContext = {
  tempC?: number | null;
  rain?: boolean;
  formality?: number | null; // target 1-5
  bestColors?: string[];
  avoidColors?: string[];
  excludeIds?: string[];
  lockedIds?: string[];
  allowDirty?: boolean;
};

export function seasonForTemp(tempC: number | null | undefined): Season | null {
  if (tempC == null) return null;
  if (tempC >= 24) return "summer";
  if (tempC >= 15) return "spring";
  if (tempC >= 7) return "fall";
  return "winter";
}

export function currentSeason(date = new Date()): Season {
  const m = date.getMonth();
  return m < 2 || m === 11 ? "winter" : m < 5 ? "spring" : m < 8 ? "summer" : "fall";
}

function paletteBonus(colors: string[], best: string[] = [], avoid: string[] = []) {
  let b = 0;
  for (const c of colors) {
    if (best.some((x) => colorDistance(x, c) < 22)) b += 4;
    if (avoid.some((x) => colorDistance(x, c) < 18)) b -= 6;
  }
  return b;
}

/** Score an outfit 0–100. */
export function scoreOutfit(items: Lite[], ctx: EngineContext = {}) {
  const colors = items.map((i) => i.colors[0]).filter(Boolean) as string[];
  let score = outfitHarmony(colors) * 0.55;

  // formality consistency
  const f = items.map((i) => i.formality ?? 2);
  const spread = Math.max(...f) - Math.min(...f);
  score += Math.max(0, 20 - spread * 7);

  // target formality
  if (ctx.formality) {
    const avg = f.reduce((a, b) => a + b, 0) / f.length;
    score -= Math.abs(avg - ctx.formality) * 5;
  }

  // weather / season fit
  const season = seasonForTemp(ctx.tempC);
  if (season) {
    const fits = items.filter((i) => !i.seasons.length || i.seasons.includes(season)).length;
    score += (fits / items.length) * 15;
  } else score += 10;

  // freshness: prefer things not worn in the last few days
  const recent = items.filter((i) => daysSince(i.last_worn) < 4).length;
  score -= recent * 5;

  score += paletteBonus(colors, ctx.bestColors, ctx.avoidColors);
  score += items.filter((i) => i.favorite).length * 1.5;

  return Math.round(Math.max(0, Math.min(100, score + 8)));
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function usable(i: Lite, ctx: EngineContext) {
  if (ctx.excludeIds?.includes(i.id)) return false;
  if (!ctx.allowDirty && i.status !== "clean" && !ctx.lockedIds?.includes(i.id)) return false;
  const season = seasonForTemp(ctx.tempC);
  if (season && i.seasons.length && !i.seasons.includes(season) && !ctx.lockedIds?.includes(i.id)) {
    // allow shoulder seasons
    const ok = (season === "spring" && i.seasons.includes("fall")) || (season === "fall" && i.seasons.includes("spring"));
    if (!ok) return false;
  }
  return true;
}

/** Generate up to `n` distinct good outfits from the closet. */
export function generateOutfits<T extends Lite>(closet: T[], ctx: EngineContext = {}, n = 3, tries = 500) {
  const pool = closet.filter((i) => usable(i, ctx));
  const by = (c: string) => pool.filter((i) => i.category === c);
  const locked = closet.filter((i) => ctx.lockedIds?.includes(i.id));
  const lockedCat = new Set(locked.map((l) => l.category));

  const tops = by("top"), bottoms = by("bottom"), dresses = by("dress"), shoes = by("shoes"), outer = by("outerwear"), acc = by("accessory");
  const needOuter = ctx.tempC != null ? ctx.tempC < 15 || !!ctx.rain : false;

  const results: { items: T[]; score: number; key: string }[] = [];
  const seen = new Set<string>();

  for (let t = 0; t < tries; t++) {
    const chosen: T[] = [...(locked as T[])];
    const useDress =
      lockedCat.has("dress") || (!lockedCat.has("top") && !lockedCat.has("bottom") && dresses.length > 0 && (tops.length === 0 || bottoms.length === 0 || Math.random() < 0.2));

    if (useDress) {
      if (!lockedCat.has("dress")) {
        if (!dresses.length) continue;
        chosen.push(pick(dresses) as T);
      }
    } else {
      if (!lockedCat.has("top")) {
        if (!tops.length) continue;
        chosen.push(pick(tops) as T);
      }
      if (!lockedCat.has("bottom")) {
        if (!bottoms.length) continue;
        chosen.push(pick(bottoms) as T);
      }
    }
    if (!lockedCat.has("shoes") && shoes.length) chosen.push(pick(shoes) as T);
    if (!lockedCat.has("outerwear") && outer.length && (needOuter || Math.random() < 0.25)) chosen.push(pick(outer) as T);
    if (!lockedCat.has("accessory") && acc.length && Math.random() < 0.3) chosen.push(pick(acc) as T);

    const key = chosen.map((c) => c.id).sort().join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ items: chosen, score: scoreOutfit(chosen, ctx), key });
  }

  results.sort((a, b) => b.score - a.score);
  // diversity: avoid returning outfits that share the same top
  const out: typeof results = [];
  for (const r of results) {
    if (out.length >= n) break;
    const overlap = out.some((o) => o.items.filter((i) => r.items.some((x) => x.id === i.id)).length >= Math.max(2, r.items.length - 1));
    if (!overlap) out.push(r);
  }
  return out;
}

const PARTNERS: Record<string, string[]> = {
  top: ["bottom", "shoes", "outerwear"],
  bottom: ["top", "shoes", "outerwear"],
  dress: ["shoes", "outerwear", "accessory"],
  outerwear: ["top", "bottom", "shoes"],
  shoes: ["bottom", "top", "dress"],
  accessory: ["top", "dress", "outerwear"],
  other: ["top", "bottom"],
};

/** Best pieces in the closet to pair with `item`. */
export function goesWith<T extends Lite>(item: Lite, closet: T[], n = 8) {
  const cats = PARTNERS[item.category] ?? [];
  const base = item.colors[0];
  return closet
    .filter((c) => c.id !== item.id && cats.includes(c.category))
    .map((c) => {
      const color = base && c.colors[0] ? pairScore(base, c.colors[0]) : 70;
      const form = 20 - Math.abs((c.formality ?? 2) - (item.formality ?? 2)) * 7;
      const season = !item.seasons.length || !c.seasons.length || c.seasons.some((s) => item.seasons.includes(s)) ? 10 : -10;
      return { item: c, score: color * 0.7 + form + season };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/** How many valid outfits could be made (approximation for insights / shopping). */
export function countOutfits(closet: Lite[], threshold = 60) {
  const tops = closet.filter((i) => i.category === "top");
  const bottoms = closet.filter((i) => i.category === "bottom");
  const dresses = closet.filter((i) => i.category === "dress").length;
  let n = dresses;
  for (const t of tops)
    for (const b of bottoms) {
      if (t.colors[0] && b.colors[0] ? pairScore(t.colors[0], b.colors[0]) >= threshold : true) n++;
    }
  return n;
}

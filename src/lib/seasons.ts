/** 12-season color analysis data and classification. */
import { rgbToLab, hexToRgb } from "@/lib/colors";
import type { Palette } from "@/lib/types";

export type SeasonKey =
  | "Light Spring" | "Warm Spring" | "Bright Spring"
  | "Light Summer" | "Cool Summer" | "Soft Summer"
  | "Soft Autumn" | "Warm Autumn" | "Deep Autumn"
  | "Deep Winter" | "Cool Winter" | "Bright Winter";

export const SEASON_PALETTES: Record<SeasonKey, { best: string[]; avoid: string[]; metals: string; blurb: string }> = {
  "Light Spring": { best: ["#f7d9a8", "#f4a988", "#9fd8c8", "#a8c8f0", "#f6e27a", "#f2b5c2", "#c8e29a", "#e8d3b0"], avoid: ["#111111", "#3a2340", "#2b3a55", "#5a1f2b"], metals: "Light gold", blurb: "Delicate and warm — light, clear, sunny shades." },
  "Warm Spring": { best: ["#f2a65a", "#e8c547", "#8cbf5a", "#40a69a", "#e07a5f", "#c8a165", "#f5deb3", "#d4553a"], avoid: ["#111111", "#b9a7d6", "#9aa5b1", "#f5f3ef"], metals: "Gold", blurb: "Golden and lively — warm, fresh, saturated colors." },
  "Bright Spring": { best: ["#ff6f61", "#ffd23f", "#1fb37a", "#1e90ff", "#ff4f9a", "#00a6a6", "#f5f3ef", "#2b2d9b"], avoid: ["#a3a3a3", "#c8b8a6", "#8a7d6b", "#b9a7d6"], metals: "Bright gold", blurb: "Clear and vivid — high-energy, warm-leaning brights." },
  "Light Summer": { best: ["#a9c1df", "#c8b8e0", "#f2c4ce", "#9fd3c7", "#e7e3f0", "#8fb3c9", "#d9a5b3", "#b8c9a3"], avoid: ["#111111", "#e07a3b", "#6b4430", "#c99a2e"], metals: "Silver, white gold", blurb: "Soft and airy — cool pastels and powdery tones." },
  "Cool Summer": { best: ["#5b7db1", "#8e6ba8", "#c2577d", "#4a8d8a", "#6e8faf", "#b35c7e", "#d7dbe8", "#3b4b6b"], avoid: ["#e07a3b", "#c99a2e", "#a6502e", "#f2a65a"], metals: "Silver", blurb: "Cool and calm — blue-based, gently muted colors." },
  "Soft Summer": { best: ["#8a9bb0", "#9c8aa5", "#b78a96", "#7f9c8f", "#a7a2a9", "#6b7a8f", "#c4a5a8", "#5f6f6a"], avoid: ["#ff4f9a", "#ffd23f", "#111111", "#ff6f61"], metals: "Pewter, rose gold", blurb: "Muted and elegant — dusty, greyed, cool-neutral shades." },
  "Soft Autumn": { best: ["#b49a7a", "#8d9a6b", "#c58b6a", "#7b8c8a", "#d1b38e", "#a6765a", "#6f7c5c", "#c9a88f"], avoid: ["#ff4f9a", "#1e90ff", "#111111", "#f5f3ef"], metals: "Brushed gold, bronze", blurb: "Gentle and earthy — warm, muted, blended tones." },
  "Warm Autumn": { best: ["#c1652f", "#d4a017", "#6b8e23", "#8b4513", "#b5651d", "#2f7a7a", "#e3b778", "#7b3f00"], avoid: ["#b9a7d6", "#a9c1df", "#ff4f9a", "#d7dbe8"], metals: "Gold, copper", blurb: "Rich and golden — spice, olive and harvest colors." },
  "Deep Autumn": { best: ["#7b2d3a", "#a6502e", "#556b2f", "#2f4a3e", "#8b5a2b", "#c99a2e", "#3a3550", "#6b4430"], avoid: ["#f2c4ce", "#a9c1df", "#e7e3f0", "#ffd23f"], metals: "Antique gold, bronze", blurb: "Deep and warm — burgundy, forest, chocolate and rust." },
  "Deep Winter": { best: ["#111111", "#7b1e3a", "#1f2a6b", "#0f5e4a", "#5e2a84", "#f5f3ef", "#b3003c", "#2f2f3a"], avoid: ["#d8c7a5", "#c19a6b", "#e8c547", "#b49a7a"], metals: "Silver, platinum", blurb: "Dramatic and deep — dark jewel tones with crisp contrast." },
  "Cool Winter": { best: ["#1f2a6b", "#c2185b", "#00796b", "#6a1b9a", "#f5f3ef", "#37474f", "#0288d1", "#ad1457"], avoid: ["#e07a3b", "#c99a2e", "#d8c7a5", "#a6502e"], metals: "Silver", blurb: "Icy and cool — true blues, magentas and pure white." },
  "Bright Winter": { best: ["#e0115f", "#0047ab", "#00a86b", "#111111", "#f5f3ef", "#7f00ff", "#ff1744", "#00bcd4"], avoid: ["#b49a7a", "#8a9bb0", "#c8b8a6", "#d1b38e"], metals: "Silver, white gold", blurb: "Bold and electric — saturated colors with high contrast." },
};

export type Measurements = { skin: string; hair: string; eyes: string };

/** Classify measured colors into one of 12 seasons. */
export function classify(m: Measurements, override?: { undertone?: "warm" | "cool" | "neutral" }): Palette {
  const skin = rgbToLab(hexToRgb(m.skin));
  const hair = rgbToLab(hexToRgb(m.hair));
  const eyes = rgbToLab(hexToRgb(m.eyes));

  // Skin hue angle: higher = more yellow (warm), lower = more pink (cool)
  const hue = (Math.atan2(skin.b, skin.a) * 180) / Math.PI;
  let undertone: Palette["undertone"] = hue > 60 ? "warm" : hue < 50 ? "cool" : "neutral";
  if (override?.undertone) undertone = override.undertone;

  const contrastVal = Math.abs(skin.L - Math.min(hair.L, eyes.L));
  const contrast: Palette["contrast"] = contrastVal > 55 ? "high" : contrastVal < 30 ? "low" : "medium";
  // Depth comes mostly from skin; very dark hair on light skin reads as contrast, not depth.
  let depth: Palette["depth"] = skin.L > 70 ? "light" : skin.L < 50 ? "deep" : "medium";
  if (depth === "light" && contrast === "high") depth = "medium";
  const chroma = Math.hypot(eyes.a, eyes.b);
  const clear = chroma > 18 || contrast === "high";

  let season: SeasonKey;
  if (undertone === "warm") {
    if (depth === "light") season = "Light Spring";
    else if (depth === "deep") season = "Deep Autumn";
    else if (clear) season = contrast === "high" ? "Bright Spring" : "Warm Spring";
    else season = contrast === "low" ? "Soft Autumn" : "Warm Autumn";
  } else if (undertone === "cool") {
    if (depth === "light") season = "Light Summer";
    else if (depth === "deep") season = contrast === "high" ? "Bright Winter" : "Deep Winter";
    else if (contrast === "high") season = "Cool Winter";
    else season = contrast === "low" ? "Soft Summer" : "Cool Summer";
  } else {
    if (depth === "light") season = contrast === "low" ? "Light Summer" : "Light Spring";
    else if (depth === "deep") season = clear ? "Deep Winter" : "Deep Autumn";
    else season = contrast === "low" ? (skin.b > 16 ? "Soft Autumn" : "Soft Summer") : clear ? "Bright Spring" : "Soft Autumn";
  }

  const p = SEASON_PALETTES[season];
  return {
    season,
    undertone,
    depth,
    contrast,
    skin: m.skin,
    hair: m.hair,
    eyes: m.eyes,
    best: p.best,
    avoid: p.avoid,
    metals: p.metals,
    analyzed_at: new Date().toISOString(),
  };
}

/** Recompute palette fields after the user manually picks a season. */
export function paletteForSeason(base: Palette, season: SeasonKey): Palette {
  const p = SEASON_PALETTES[season];
  return { ...base, season, best: p.best, avoid: p.avoid, metals: p.metals, analyzed_at: new Date().toISOString() };
}

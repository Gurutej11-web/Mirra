import type { StyleDNA } from "@/lib/types";

export const STYLES = {
  streetwear: { label: "Streetwear", keywords: ["graphic", "oversized", "sneakers", "layered"] },
  minimalist: { label: "Minimalist", keywords: ["clean lines", "neutrals", "quality basics"] },
  classic: { label: "Classic Prep", keywords: ["tailored", "oxford", "chinos", "loafers"] },
  athleisure: { label: "Athleisure", keywords: ["technical", "comfort", "sporty"] },
  oldmoney: { label: "Quiet Luxury", keywords: ["cashmere", "camel", "understated"] },
  techwear: { label: "Gorpcore & Tech", keywords: ["utility", "outdoor", "functional"] },
  vintage: { label: "Vintage", keywords: ["thrifted", "retro", "denim", "texture"] },
  edgy: { label: "Edgy", keywords: ["black", "leather", "boots", "contrast"] },
  boho: { label: "Boho", keywords: ["flowy", "earthy", "prints", "natural fabrics"] },
  smart: { label: "Smart Casual", keywords: ["polished", "versatile", "knitwear"] },
} as const;

export type StyleKey = keyof typeof STYLES;

export type QuizCard = {
  id: string;
  title: string;
  pieces: string[];
  colors: string[];
  weights: Partial<Record<StyleKey, number>>;
};

export const QUIZ_CARDS: QuizCard[] = [
  { id: "q1", title: "Hoodie & cargos", pieces: ["Boxy graphic hoodie", "Wide cargo pants", "Chunky sneakers"], colors: ["#2b2b2b", "#6b6b4f", "#e6e1d6"], weights: { streetwear: 3, techwear: 1 } },
  { id: "q2", title: "Crisp monochrome", pieces: ["White tee", "Straight black trousers", "Minimal leather sneakers"], colors: ["#f5f3ef", "#151515", "#cfcac2"], weights: { minimalist: 3, smart: 1 } },
  { id: "q3", title: "Oxford & chinos", pieces: ["Blue oxford shirt", "Khaki chinos", "Brown loafers"], colors: ["#a9c1df", "#c8b48e", "#6b4430"], weights: { classic: 3, smart: 1 } },
  { id: "q4", title: "Gym to coffee", pieces: ["Zip running top", "Tapered joggers", "Running shoes"], colors: ["#3c4a5a", "#1d1f22", "#d8dde3"], weights: { athleisure: 3, streetwear: 1 } },
  { id: "q5", title: "Camel & cream", pieces: ["Cashmere crewneck", "Pleated wool trousers", "Suede loafers"], colors: ["#c7a27a", "#efe6d6", "#7a5a3c"], weights: { oldmoney: 3, classic: 1 } },
  { id: "q6", title: "Trail ready", pieces: ["Shell jacket", "Nylon hiking pants", "Trail shoes"], colors: ["#3f5d4c", "#2a2f2a", "#d97b3b"], weights: { techwear: 3, athleisure: 1 } },
  { id: "q7", title: "Thrift store gold", pieces: ["Faded band tee", "Vintage straight jeans", "Worn-in high tops"], colors: ["#9b8a74", "#5277a0", "#e9e2d0"], weights: { vintage: 3, streetwear: 1 } },
  { id: "q8", title: "All black, sharp", pieces: ["Leather jacket", "Black slim jeans", "Chelsea boots"], colors: ["#111111", "#2a2a2a", "#4a4a4a"], weights: { edgy: 3, minimalist: 1 } },
  { id: "q9", title: "Earthy & flowy", pieces: ["Linen shirt", "Relaxed drawstring pants", "Leather sandals"], colors: ["#d8c7a5", "#8a6f4d", "#a66a3f"], weights: { boho: 3, vintage: 1 } },
  { id: "q10", title: "Knit & blazer", pieces: ["Merino polo", "Unstructured blazer", "Dark denim"], colors: ["#30405a", "#9c8f7d", "#24324a"], weights: { smart: 3, classic: 1 } },
  { id: "q11", title: "Varsity layers", pieces: ["Varsity jacket", "Grey sweatpants", "Retro court sneakers"], colors: ["#7b2d3a", "#9a9a9a", "#f1ede4"], weights: { streetwear: 2, vintage: 2 } },
  { id: "q12", title: "Tonal neutrals", pieces: ["Oatmeal knit", "Ecru wide trousers", "Cream sneakers"], colors: ["#e3d8c4", "#d9cdb3", "#f3ede2"], weights: { minimalist: 2, oldmoney: 2 } },
  { id: "q13", title: "Utility everyday", pieces: ["Chore jacket", "Carpenter pants", "Work boots"], colors: ["#4c5a3e", "#8a7350", "#5a3d28"], weights: { techwear: 1, vintage: 2, streetwear: 1 } },
  { id: "q14", title: "Moody textures", pieces: ["Black knit turtleneck", "Charcoal wool coat", "Leather boots"], colors: ["#1a1a1a", "#3a3a3d", "#2e2622"], weights: { edgy: 2, minimalist: 1, oldmoney: 1 } },
  { id: "q15", title: "Sunny prints", pieces: ["Printed camp-collar shirt", "Linen shorts", "Canvas sneakers"], colors: ["#e0a458", "#f3ead7", "#4f7c8a"], weights: { boho: 2, smart: 1, vintage: 1 } },
];

export const OCCASIONS = [
  "School / class",
  "Work / office",
  "Going out",
  "Dates",
  "Gym",
  "Events & weddings",
  "Travel",
  "Lounging",
] as const;

export const FIT_OPTIONS = ["slim", "regular", "relaxed", "oversized"] as const;

export const BUDGETS = ["Thrift & budget", "Mid-range", "Premium", "Mix of everything"] as const;

export const SWATCHES: { name: string; hex: string }[] = [
  { name: "Black", hex: "#111111" },
  { name: "Charcoal", hex: "#3a3a3d" },
  { name: "Grey", hex: "#9a9a9a" },
  { name: "White", hex: "#f5f3ef" },
  { name: "Cream", hex: "#efe6d6" },
  { name: "Beige", hex: "#d8c7a5" },
  { name: "Camel", hex: "#c19a6b" },
  { name: "Brown", hex: "#6b4430" },
  { name: "Navy", hex: "#1f2a44" },
  { name: "Blue", hex: "#3d6fb6" },
  { name: "Light blue", hex: "#a9c1df" },
  { name: "Teal", hex: "#2f7a7a" },
  { name: "Green", hex: "#3f7d4c" },
  { name: "Olive", hex: "#6b6b3a" },
  { name: "Sage", hex: "#a3b18a" },
  { name: "Yellow", hex: "#e8c547" },
  { name: "Mustard", hex: "#c99a2e" },
  { name: "Orange", hex: "#e07a3b" },
  { name: "Rust", hex: "#a6502e" },
  { name: "Red", hex: "#c0392b" },
  { name: "Burgundy", hex: "#7b2d3a" },
  { name: "Pink", hex: "#e8a1b5" },
  { name: "Lavender", hex: "#b9a7d6" },
  { name: "Purple", hex: "#5e3a87" },
];

/** Turn quiz likes into a Style DNA profile. */
export function computeStyleDNA(liked: string[], disliked: string[], occasions: string[]): StyleDNA {
  const scores = Object.fromEntries(Object.keys(STYLES).map((k) => [k, 0])) as Record<StyleKey, number>;
  for (const card of QUIZ_CARDS) {
    const sign = liked.includes(card.id) ? 1 : disliked.includes(card.id) ? -0.5 : 0;
    if (!sign) continue;
    for (const [k, w] of Object.entries(card.weights)) scores[k as StyleKey] += sign * (w ?? 0);
  }
  const ranked = (Object.entries(scores) as [StyleKey, number][]).sort((a, b) => b[1] - a[1]);
  const [primary, secondary] = ranked;
  const max = Math.max(primary[1], 1);
  const normalized = Object.fromEntries(
    ranked.map(([k, v]) => [k, Math.max(0, Math.round((v / max) * 100))]),
  );
  const p = STYLES[primary[0]];
  const s = STYLES[secondary[0]];
  const keywords = Array.from(new Set([...p.keywords, ...s.keywords.slice(0, 2)]));
  return {
    primary: primary[0],
    secondary: secondary[0],
    scores: normalized,
    keywords,
    summary: `${p.label} at heart with a ${s.label.toLowerCase()} streak — think ${keywords.slice(0, 3).join(", ")}.`,
    occasions,
  };
}

export function styleLabel(key?: string) {
  return key && key in STYLES ? STYLES[key as StyleKey].label : "Undiscovered";
}

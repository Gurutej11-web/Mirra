/** Color helpers: conversions, naming, families and harmony checks. */

export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };

export function normalizeHex(hex: string): string | null {
  const m = hex.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(m)) return `#${m.split("").map((c) => c + c).join("")}`.toLowerCase();
  if (/^[0-9a-f]{6}$/i.test(m)) return `#${m}`.toLowerCase();
  return null;
}

export function hexToRgb(hex: string): RGB {
  const h = normalizeHex(hex) ?? "#000000";
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB) {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: HSL) {
  const sn = s / 100, ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex({ r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 });
}

export const hexToHsl = (hex: string) => rgbToHsl(hexToRgb(hex));

/** sRGB → CIE Lab (D65). */
export function rgbToLab({ r, g, b }: RGB) {
  const lin = (c: number) => {
    const v = c / 255;
    return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92;
  };
  const R = lin(r), G = lin(g), B = lin(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

/** Perceptual distance (CIE76). < ~12 looks like "the same color". */
export function colorDistance(a: string, b: string) {
  const A = rgbToLab(hexToRgb(a)), B = rgbToLab(hexToRgb(b));
  return Math.hypot(A.L - B.L, A.a - B.a, A.b - B.b);
}

export const COLOR_FAMILIES = [
  "black", "grey", "white", "cream", "beige", "brown",
  "red", "orange", "yellow", "green", "teal", "blue", "purple", "pink",
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export const FAMILY_SWATCH: Record<ColorFamily, string> = {
  black: "#111111", grey: "#8a8a8a", white: "#f5f3ef", cream: "#efe6d6", beige: "#d8c7a5",
  brown: "#6b4430", red: "#c0392b", orange: "#e07a3b", yellow: "#e8c547", green: "#3f7d4c",
  teal: "#2f7a7a", blue: "#3d6fb6", purple: "#6e4a9e", pink: "#e8a1b5",
};

export function colorFamily(hex: string): ColorFamily {
  const { h, s, l } = hexToHsl(hex);
  if (l < 13) return "black";
  if (l > 92 && s < 30) return "white";
  if (s < 12) return l < 25 ? "black" : l > 85 ? "white" : "grey";
  // warm low-saturation tones
  if (h >= 20 && h < 55 && s < 55) {
    if (l > 82) return "cream";
    if (l > 58) return "beige";
    if (l < 45) return "brown";
  }
  if (h >= 10 && h < 45 && l < 40) return "brown";
  if (h < 12 || h >= 345) return l > 70 ? "pink" : "red";
  if (h < 40) return "orange";
  if (h < 65) return "yellow";
  if (h < 160) return "green";
  if (h < 195) return "teal";
  if (h < 255) return "blue";
  if (h < 300) return "purple";
  return l > 55 ? "pink" : "purple";
}

const NEUTRALS: ColorFamily[] = ["black", "grey", "white", "cream", "beige", "brown"];
export const isNeutral = (hex: string) => NEUTRALS.includes(colorFamily(hex)) || colorFamily(hex) === "blue" && hexToHsl(hex).l < 25;

export function colorName(hex: string) {
  const fam = colorFamily(hex);
  const { l, s } = hexToHsl(hex);
  if (NEUTRALS.includes(fam)) return fam === "grey" ? (l < 35 ? "charcoal" : l > 70 ? "light grey" : "grey") : fam;
  if (fam === "blue" && l < 28) return "navy";
  if (fam === "red" && l < 35) return "burgundy";
  if (fam === "green" && s < 35) return l > 55 ? "sage" : "olive";
  if (fam === "yellow" && s < 70 && l < 55) return "mustard";
  const prefix = l < 30 ? "deep " : l > 75 ? "light " : "";
  return prefix + fam;
}

function hueDiff(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * How well two colors go together, 0–100.
 * Neutrals go with everything; otherwise reward analogous, complementary and triadic relationships.
 */
export function pairScore(a: string, b: string) {
  if (isNeutral(a) || isNeutral(b)) return 90;
  const A = hexToHsl(a), B = hexToHsl(b);
  const d = hueDiff(A.h, B.h);
  let score: number;
  if (d < 15) score = 85; // monochrome
  else if (d < 45) score = 80; // analogous
  else if (d > 160) score = 78; // complementary
  else if (d > 110 && d < 130) score = 70; // triadic
  else score = 45; // clashing zone
  // Two very saturated colors fight for attention
  if (A.s > 70 && B.s > 70 && d > 45) score -= 12;
  return Math.max(0, Math.min(100, score));
}

/** Average pair score over all colors (first color of each item). */
export function outfitHarmony(colors: string[]) {
  const c = colors.filter(Boolean);
  if (c.length < 2) return 85;
  let sum = 0, n = 0;
  for (let i = 0; i < c.length; i++)
    for (let j = i + 1; j < c.length; j++) {
      sum += pairScore(c[i], c[j]);
      n++;
    }
  const brights = c.filter((x) => !isNeutral(x)).length;
  return Math.round(sum / n - Math.max(0, brights - 2) * 8);
}

/** Suggested companion colors for a hex. */
export function harmonies(hex: string) {
  const { h, s, l } = hexToHsl(hex);
  return {
    complementary: [hslToHex({ h: (h + 180) % 360, s, l })],
    analogous: [hslToHex({ h: (h + 30) % 360, s, l }), hslToHex({ h: (h + 330) % 360, s, l })],
    triadic: [hslToHex({ h: (h + 120) % 360, s, l }), hslToHex({ h: (h + 240) % 360, s, l })],
    monochrome: [hslToHex({ h, s, l: Math.min(90, l + 20) }), hslToHex({ h, s, l: Math.max(10, l - 20) })],
  };
}

/** Readable text color on top of a background. */
export function onColor(hex: string) {
  return hexToHsl(hex).l > 60 ? "#111111" : "#ffffff";
}

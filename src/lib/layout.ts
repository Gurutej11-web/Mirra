import type { Category } from "@/lib/types";

export type Layer = { x: number; y: number; scale: number; rotate?: number; z?: number };

/** Default placement for each category on the 300×640 avatar (percent units). */
export const SLOTS: Record<Category, { x: number; y: number; w: number; z: number }> = {
  shoes: { x: 50, y: 93, w: 44, z: 1 },
  bottom: { x: 50, y: 70, w: 50, z: 2 },
  top: { x: 50, y: 36, w: 64, z: 3 },
  dress: { x: 50, y: 50, w: 64, z: 3 },
  outerwear: { x: 50, y: 37, w: 74, z: 4 },
  accessory: { x: 76, y: 50, w: 22, z: 5 },
  other: { x: 24, y: 50, w: 22, z: 5 },
};

export function defaultLayer(category: Category): Layer {
  const s = SLOTS[category];
  return { x: s.x, y: s.y, scale: 1, rotate: 0, z: s.z };
}

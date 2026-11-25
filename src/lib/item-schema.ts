import { z } from "zod";
import { CATEGORIES, SEASONS } from "@/lib/types";
import { normalizeHex } from "@/lib/colors";

const hexList = z
  .array(z.string())
  .catch([])
  .transform((arr) => arr.map((c) => normalizeHex(c)).filter((c): c is string => !!c).slice(0, 4));

/** What the vision model returns for one clothing item (lenient — fills defaults). */
export const aiItemSchema = z.object({
  name: z.string().min(1).max(80).catch("New item"),
  category: z.enum(CATEGORIES).catch("other"),
  subcategory: z.string().max(40).nullable().catch(null),
  colors: hexList,
  pattern: z.string().max(30).nullable().catch(null),
  material: z.string().max(40).nullable().catch(null),
  formality: z.coerce.number().int().min(1).max(5).catch(2),
  seasons: z
    .array(z.string())
    .catch([])
    .transform((a) => a.map((s) => s.toLowerCase()).filter((s): s is (typeof SEASONS)[number] => (SEASONS as readonly string[]).includes(s))),
  tags: z
    .array(z.string())
    .catch([])
    .transform((a) => a.map((t) => t.toLowerCase().slice(0, 24)).slice(0, 8)),
  brand: z.string().max(40).nullable().catch(null),
});
export type AIItem = z.infer<typeof aiItemSchema>;

export const TAG_PROMPT = `You are a fashion cataloguing assistant. Look at the clothing item in the image and describe it for a wardrobe app.
Reply with ONLY a JSON object with these keys:
- "name": short descriptive name, e.g. "Navy cable-knit sweater" (max 6 words)
- "category": one of ${CATEGORIES.join(", ")}
- "subcategory": e.g. "t-shirt", "jeans", "sneakers", "hoodie", "blazer"
- "colors": array of 1-3 hex codes of the dominant garment colors, most dominant first (ignore the background)
- "pattern": e.g. "solid", "striped", "plaid", "graphic", "floral", "checked"
- "material": best guess, e.g. "cotton", "denim", "wool", "leather", "polyester"
- "formality": integer 1 (very casual) to 5 (formal)
- "seasons": array from ["spring","summer","fall","winter"] when it is comfortable to wear
- "tags": 2-6 short lowercase style tags, e.g. ["oversized","streetwear","basic"]
- "brand": brand name only if a logo or label is clearly visible, else null`;

/** Fields the user can save (validated server-side before insert/update). */
export const itemInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(CATEGORIES),
  subcategory: z.string().trim().max(40).nullable(),
  colors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(4),
  pattern: z.string().trim().max(30).nullable(),
  material: z.string().trim().max(40).nullable(),
  formality: z.number().int().min(1).max(5).nullable(),
  seasons: z.array(z.enum(SEASONS)).max(4),
  tags: z.array(z.string().trim().max(24)).max(10),
  brand: z.string().trim().max(40).nullable(),
  price: z.number().min(0).max(100000).nullable(),
  source_url: z.string().url().max(1000).nullable(),
  purchased_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  notes: z.string().max(500).nullable(),
  wear_goal: z.number().int().min(1).max(1000).nullable(),
});
export type ItemInput = z.infer<typeof itemInputSchema>;

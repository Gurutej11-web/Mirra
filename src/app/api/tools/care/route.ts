import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJSON, TEXT_MODEL } from "@/lib/ai";
import { apiHandler, jsonError } from "@/lib/api";
import { colorName } from "@/lib/colors";

export const maxDuration = 30;

const body = z.object({ itemId: z.string().uuid() });
const schema = z.object({
  wash: z.string().max(200).catch(""),
  dry: z.string().max(200).catch(""),
  iron: z.string().max(200).catch(""),
  store: z.string().max(200).catch(""),
  stains: z.array(z.string().max(200)).catch([]),
  lifespan_tip: z.string().max(200).catch(""),
});

/** AI care guide for one item, cached into the item's notes when the user saves it. */
export const POST = apiHandler("care", { max: 15, windowMs: 60_000 }, async ({ supabase }, req) => {
  const p = body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return jsonError("Invalid request.");
  const { data: item } = await supabase.from("items").select("name, category, subcategory, material, colors, pattern").eq("id", p.data.itemId).maybeSingle();
  if (!item) return jsonError("Item not found.", 404);

  const prompt = `Give practical care instructions for this clothing item: ${item.name} (${item.subcategory ?? item.category}), material: ${item.material ?? "unknown — assume the most common material for this type"}, color: ${(item.colors as string[]).map(colorName).join(", ") || "unknown"}, pattern: ${item.pattern ?? "solid"}.
Be specific (temperatures, cycles, inside-out, etc.). Note: always defer to the care label if present.
Reply with ONLY JSON: {"wash":"...","dry":"...","iron":"...","store":"...","stains":["2-3 common stain fixes"],"lifespan_tip":"one tip to make it last longer"}`;

  const ai = await aiJSON(schema, [{ role: "user", content: prompt }], { model: TEXT_MODEL, temperature: 0.2, maxTokens: 700 });
  return NextResponse.json({ ...ai, stains: ai.stains.slice(0, 3) });
});

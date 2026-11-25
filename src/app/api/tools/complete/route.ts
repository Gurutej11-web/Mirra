import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJSON, TEXT_MODEL } from "@/lib/ai";
import { apiHandler, jsonError } from "@/lib/api";
import { closetContext, loadClosetLines, profileContext } from "@/lib/context";
import type { Profile } from "@/lib/types";

export const maxDuration = 30;

const body = z.object({ itemIds: z.array(z.string().uuid()).min(1).max(10), occasion: z.string().max(60).optional() });
const schema = z.object({
  add: z.array(z.string()).catch([]),
  remove: z.array(z.string()).catch([]),
  why: z.string().max(400).catch(""),
});

/** Complete the look: given a partial outfit, pick the missing pieces from the closet. */
export const POST = apiHandler("complete", { max: 15, windowMs: 60_000 }, async ({ supabase, user }, req) => {
  const p = body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return jsonError("Pick at least one piece first.");
  const [{ data: profile }, closet] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    loadClosetLines(supabase),
  ]);
  const chosen = closet.filter((c) => p.data.itemIds.includes(c.id));

  const prompt = `The user started an outfit with these pieces:
${closetContext(chosen)}
Complete the look using ONLY items from their closet below (exact ids). Add what's missing for a complete outfit (top+bottom or dress, shoes, outer layer/accessory if it elevates it). Only suggest removing a chosen piece if it clearly clashes. Prefer clean items. ${p.data.occasion ? `Occasion: ${p.data.occasion}.` : ""}

About them:
${profileContext(profile as Profile | null)}
Closet:
${closetContext(closet)}

Reply with ONLY JSON: {"add":["ids to add"],"remove":["ids to remove, usually empty"],"why":"one or two sentences"}`;

  const ai = await aiJSON(schema, [{ role: "user", content: prompt }], { model: TEXT_MODEL, temperature: 0.4, maxTokens: 600 });
  const ids = new Set(closet.map((c) => c.id));
  return NextResponse.json({
    add: ai.add.filter((i) => ids.has(i) && !p.data.itemIds.includes(i)).slice(0, 5),
    remove: ai.remove.filter((i) => p.data.itemIds.includes(i)).slice(0, 2),
    why: ai.why,
  });
});

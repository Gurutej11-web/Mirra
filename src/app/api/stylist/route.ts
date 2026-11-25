import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJSON, TEXT_MODEL, type ChatMsg } from "@/lib/ai";
import { apiHandler, jsonError } from "@/lib/api";
import { closetContext, loadClosetLines, profileContext, SAFETY_RULES } from "@/lib/context";
import { fmtTemp, getWeather, layeringAdvice } from "@/lib/weather";
import type { Profile } from "@/lib/types";

export const maxDuration = 60;

const body = z.object({ message: z.string().trim().min(1).max(1500) });

const replySchema = z.object({
  reply: z.string().min(1).max(4000),
  outfits: z
    .array(
      z.object({
        name: z.string().max(60).catch("Outfit idea"),
        item_ids: z.array(z.string()).catch([]),
        why: z.string().max(400).catch(""),
      }),
    )
    .catch([])
    .transform((o) => o.slice(0, 4)),
  shopping: z
    .array(z.object({ name: z.string().max(80), why: z.string().max(300).catch("") }))
    .catch([])
    .transform((s) => s.slice(0, 4)),
});

export const POST = apiHandler("stylist", { max: 15, windowMs: 60_000 }, async ({ supabase, user }, req) => {
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Type a message first.");
  const message = parsed.data.message;

  const [{ data: profile }, closet, { data: history }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    loadClosetLines(supabase),
    supabase.from("chat_messages").select("role, content").order("created_at", { ascending: false }).limit(12),
  ]);
  const p = profile as Profile | null;

  let weatherLine = "Weather: unknown (no location set).";
  if (p?.location) {
    const w = await getWeather(p.location.lat, p.location.lon, 3);
    if (w)
      weatherLine = `Weather in ${p.location.name} now: ${fmtTemp(w.tempC, p.units)} (feels ${fmtTemp(w.feelsC, p.units)}), ${w.description}. Tomorrow: ${fmtTemp(w.daily[1]?.minC ?? w.tempC, p.units)}–${fmtTemp(w.daily[1]?.maxC ?? w.tempC, p.units)}, ${w.daily[1]?.description}. ${layeringAdvice(w)}`;
  }

  const system = `You are Mirra, a friendly, sharp personal stylist inside a wardrobe app. You know every piece the user owns.
${SAFETY_RULES}
- Build outfits ONLY from the closet list using exact item ids. Prefer clean items; mention if something is in the laundry.
- A complete outfit is usually top + bottom (or a dress) + shoes, plus outerwear when it's cold or rainy.
- Respect their palette, style DNA, fit preferences and banned colors.
- If their closet lacks something needed, say so and add it to "shopping" (generic description, no brands or links).
- Keep "reply" conversational and concise (under 120 words), using short paragraphs or "- " bullet lines. No markdown headings.
- Today is ${new Date().toDateString()}. ${weatherLine}

About the user:
${profileContext(p)}

Closet (id | name | category | colors | formality | seasons | status | wear):
${closetContext(closet) || "(empty — encourage them to add clothes)"}

Always reply with ONLY JSON: {"reply":"...","outfits":[{"name":"...","item_ids":["..."],"why":"one sentence"}],"shopping":[{"name":"...","why":"..."}]}
Use empty arrays when not relevant.`;

  const messages: ChatMsg[] = [
    { role: "system", content: system },
    ...((history ?? []).reverse() as { role: "user" | "assistant"; content: string }[]).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  const ai = await aiJSON(replySchema, messages, { model: TEXT_MODEL, temperature: 0.6, maxTokens: 1500 });

  const ids = new Set(closet.map((c) => c.id));
  const outfits = ai.outfits
    .map((o) => ({ ...o, item_ids: Array.from(new Set(o.item_ids.filter((id) => ids.has(id)))).slice(0, 8) }))
    .filter((o) => o.item_ids.length > 0);

  const reply = ai.shopping.length
    ? `${ai.reply}\n\nWorth adding:\n${ai.shopping.map((s) => `- ${s.name}${s.why ? ` — ${s.why}` : ""}`).join("\n")}`
    : ai.reply;

  const { data: saved, error } = await supabase
    .from("chat_messages")
    .insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: reply, attached_outfits: outfits },
    ])
    .select("id, role, content, attached_outfits, created_at");
  if (error) return jsonError(`Couldn't save the chat: ${error.message}`, 500);

  return NextResponse.json({ messages: saved });
});

export const DELETE = apiHandler("stylist-clear", { max: 5, windowMs: 60_000 }, async ({ supabase, user }) => {
  const { error } = await supabase.from("chat_messages").delete().eq("user_id", user.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
});

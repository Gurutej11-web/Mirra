import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJSON, TEXT_MODEL } from "@/lib/ai";
import { apiHandler, jsonError } from "@/lib/api";
import { closetContext, loadClosetLines, profileContext } from "@/lib/context";
import { describe } from "@/lib/weather";
import type { Profile } from "@/lib/types";

export const maxDuration = 60;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const body = z.object({
  destination: z.object({ name: z.string().min(1).max(80), lat: z.number(), lon: z.number() }),
  start: day,
  end: day,
  activities: z.array(z.string().max(40)).max(10),
  notes: z.string().max(300).optional(),
});

const planSchema = z.object({
  summary: z.string().max(600).catch(""),
  days: z
    .array(z.object({ date: z.string().max(12), label: z.string().max(60).catch(""), item_ids: z.array(z.string()).catch([]), note: z.string().max(200).catch("") }))
    .catch([]),
  checklist: z
    .array(
      z.object({
        name: z.string().max(80),
        item_id: z.string().nullable().optional().catch(null),
        qty: z.coerce.number().int().min(1).max(30).catch(1),
        group: z.string().max(30).catch("Clothes"),
      }),
    )
    .catch([]),
  tips: z.array(z.string().max(200)).catch([]),
});

export const POST = apiHandler("packing", { max: 6, windowMs: 60_000 }, async ({ supabase, user }, req) => {
  const p = body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return jsonError("Pick a destination and dates.");
  const { destination, start, end, activities, notes } = p.data;
  const nights = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
  if (nights < 0 || nights > 30) return jsonError("Trips can be up to 30 days.");

  // Forecast if the trip is within the next 16 days
  let forecast = "Forecast not available yet — use typical seasonal weather for that place and month.";
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${destination.lat}&longitude=${destination.lon}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&start_date=${start}&end_date=${end}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j = await r.json();
      if (j.daily?.time?.length)
        forecast = (j.daily.time as string[])
          .map((d, i) => `${d}: ${Math.round(j.daily.temperature_2m_min[i])}–${Math.round(j.daily.temperature_2m_max[i])}°C, ${describe(j.daily.weather_code[i])}, rain ${j.daily.precipitation_probability_max?.[i] ?? 0}%`)
          .join("\n");
    }
  } catch {
    /* fall back to seasonal guess */
  }

  const [{ data: profile }, closet] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    loadClosetLines(supabase),
  ]);

  const prompt = `Plan a smart, minimal packing list for a trip, using the traveler's own closet.
Destination: ${destination.name}. Dates: ${start} to ${end} (${nights + 1} days). Activities: ${activities.join(", ") || "general sightseeing"}. ${notes ? `Notes: ${notes}` : ""}
Weather:
${forecast}

Traveler:
${profileContext(profile as Profile | null)}

Closet (id | name | category | colors | formality | seasons | status | wear):
${closetContext(closet) || "(empty)"}

Rules:
- Build a capsule: re-use versatile pieces across days so the bag stays light. Each day gets an outfit from closet item ids.
- The checklist lists every clothing piece to pack once (with item_id when from the closet) plus essentials (underwear/socks counts, sleepwear, toiletries, chargers, documents) as non-closet entries (item_id null). Groups: Clothes, Shoes, Accessories, Essentials, Toiletries, Tech, Documents.
- If the closet is missing something the weather or activities need, add it to the checklist with item_id null and mention it in tips.
- 3-5 short practical tips.
Reply with ONLY JSON: {"summary":"2 sentences","days":[{"date":"YYYY-MM-DD","label":"Arrival day","item_ids":["..."],"note":"..."}],"checklist":[{"name":"...","item_id":null,"qty":1,"group":"Clothes"}],"tips":["..."]}`;

  const ai = await aiJSON(planSchema, [{ role: "user", content: prompt }], { model: TEXT_MODEL, temperature: 0.4, maxTokens: 3000 });
  const ids = new Set(closet.map((c) => c.id));
  const plan = {
    ...ai,
    forecast,
    activities,
    days: ai.days.slice(0, 31).map((d) => ({ ...d, item_ids: d.item_ids.filter((i) => ids.has(i)) })),
    checklist: ai.checklist.slice(0, 120).map((c, i) => ({ ...c, key: `${i}-${c.name}`, item_id: c.item_id && ids.has(c.item_id) ? c.item_id : null })),
    tips: ai.tips.slice(0, 6),
  };

  const { data, error } = await supabase
    .from("packing_lists")
    .insert({ user_id: user.id, destination: destination.name, start_date: start, end_date: end, plan })
    .select("id")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ id: data.id });
});

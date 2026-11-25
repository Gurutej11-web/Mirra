"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CloudRain, Loader2, Plus, Repeat, Sun, Wand2, X } from "lucide-react";
import { OutfitCanvas } from "@/components/tryon/outfit-canvas";
import { TodayPicks } from "@/components/planner/today-picks";
import { LocationPicker } from "@/components/planner/location-picker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { generateOutfits } from "@/lib/outfit-engine";
import { outfitWarnings } from "@/lib/warnings";
import { fmtTemp, isWet, type Weather } from "@/lib/weather";
import { planCombo, setPlan } from "@/app/(app)/planner/actions";
import type { AvatarConfig, ItemWithImage, Outfit, PlannerEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Planner({
  days,
  items,
  outfits,
  entries,
  recentWears,
  weather,
  units,
  location,
  palette,
  avatar,
  focusOutfitId,
}: {
  days: string[];
  items: ItemWithImage[];
  outfits: Outfit[];
  entries: PlannerEntry[];
  recentWears: { outfit_id: string | null; item_ids: string[]; worn_on: string }[];
  weather: Weather | null;
  units: "metric" | "imperial";
  location: string | null;
  palette: { best: string[]; avoid: string[] };
  avatar: AvatarConfig;
  focusOutfitId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [picking, setPicking] = useState<string | null>(null);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const outfitById = useMemo(() => new Map(outfits.map((o) => [o.id, o])), [outfits]);
  const entryByDay = useMemo(() => new Map(entries.map((e) => [e.day, e])), [entries]);
  const focus = focusOutfitId ? outfitById.get(focusOutfitId) : null;

  function run(fn: () => Promise<{ error?: string } | { ok: boolean }>, msg: string) {
    start(async () => {
      const r = await fn();
      if ("error" in r && r.error) toast(r.error, { tone: "error" });
      else {
        toast(msg);
        setPicking(null);
        router.refresh();
        if (focus) router.replace("/planner");
      }
    });
  }

  function autoPick(day: string, idx: number) {
    const f = weather?.daily[idx];
    const tempC = f ? (f.maxC + f.minC) / 2 : null;
    const plannedIds = entries.flatMap((e) => (e.outfit_id ? outfitById.get(e.outfit_id)?.item_ids ?? [] : []));
    const [best] = generateOutfits(items, { tempC, rain: f ? isWet(f.code) || f.rainChance >= 50 : false, bestColors: palette.best, avoidColors: palette.avoid, excludeIds: plannedIds.filter((id) => itemById.get(id)?.category === "top"), allowDirty: true }, 1);
    if (!best) return toast("Not enough clothes to auto-plan yet.", { tone: "info" });
    run(() => planCombo(day, best.items.map((i) => i.id), `${new Date(day + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" })} look`), "Planned");
  }

  function repeatInfo(o: Outfit, day: string) {
    const worn = recentWears.find((w) => w.outfit_id === o.id || (w.item_ids.length > 1 && w.item_ids.every((id) => o.item_ids.includes(id))));
    const twice = entries.filter((e) => e.outfit_id === o.id && e.day !== day).length;
    if (twice) return "Also planned another day this week";
    if (worn) return `Worn on ${new Date(worn.worn_on + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;
    return null;
  }

  return (
    <div className="mt-8 space-y-12">
      {focus && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <span>Pick a day below for <strong>{focus.name}</strong>.</span>
          <button onClick={() => router.replace("/planner")} aria-label="Cancel"><X className="size-4" /></button>
        </div>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl">Today&apos;s picks</h2>
          <div className="w-full max-w-xs">
            <LocationPicker current={location} />
          </div>
        </div>
        {!location && <p className="mb-4 text-sm text-fg-muted">Set your city for weather-smart suggestions.</p>}
        <TodayPicks items={items} weather={weather} units={units} palette={palette} tomorrow={days[1]} />
      </div>

      <div>
        <h2 className="font-display text-3xl">This week</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {days.map((day, idx) => {
            const e = entryByDay.get(day);
            const o = e?.outfit_id ? outfitById.get(e.outfit_id) : null;
            const its = o ? o.item_ids.map((id) => itemById.get(id)).filter((x): x is ItemWithImage => !!x) : [];
            const f = weather?.daily[idx];
            const warnings = o ? outfitWarnings(its, f ?? null) : [];
            const repeat = o ? repeatInfo(o, day) : null;
            const date = new Date(day + "T00:00:00");
            return (
              <div key={day} className={cn("flex flex-col rounded-3xl border p-3", idx === 0 ? "border-accent/50" : "border-border")}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : date.toLocaleDateString(undefined, { weekday: "long" })}</p>
                    <p className="text-xs text-fg-subtle">{date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                  </div>
                  {f && (
                    <div className="text-right text-xs text-fg-muted" title={f.description}>
                      {isWet(f.code) || f.rainChance >= 50 ? <CloudRain className="ml-auto size-4" /> : <Sun className="ml-auto size-4" />}
                      {fmtTemp(f.maxC, units)}/{fmtTemp(f.minC, units)}
                    </div>
                  )}
                </div>

                {o ? (
                  <>
                    <Link href={`/outfits/${o.id}`} className="mt-2 block rounded-2xl bg-surface-2/60">
                      <OutfitCanvas items={its} layout={o.layout} avatar={avatar} className="mx-auto w-3/4" />
                    </Link>
                    <p className="mt-2 truncate text-xs">{o.name}</p>
                    {repeat && <p className="mt-1 flex items-center gap-1 text-[11px] text-fg-subtle"><Repeat className="size-3" /> {repeat}</p>}
                    {warnings.map((w) => (
                      <p key={w} className="mt-1 flex items-start gap-1 text-[11px] text-warning"><AlertTriangle className="mt-0.5 size-3 shrink-0" /> {w}</p>
                    ))}
                    <div className="mt-auto flex gap-1 pt-2">
                      <button onClick={() => setPicking(day)} className="text-xs text-fg-muted hover:text-fg">Change</button>
                      <span className="text-fg-subtle">·</span>
                      <button onClick={() => run(() => setPlan(day, null), "Removed")} className="text-xs text-fg-muted hover:text-danger">Remove</button>
                    </div>
                  </>
                ) : focus ? (
                  <Button size="sm" className="mt-auto" disabled={pending} onClick={() => run(() => setPlan(day, focus.id), `Planned ${focus.name}`)}>
                    Plan here
                  </Button>
                ) : (
                  <div className="mt-3 flex flex-1 flex-col justify-end gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => setPicking(day)} disabled={!outfits.length}>
                      <Plus className="size-3.5" /> Choose
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => autoPick(day, idx)} disabled={pending}>
                      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />} Auto
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {picking && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-6" onClick={() => setPicking(null)}>
          <div className="max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl bg-bg-elevated p-5 sm:max-w-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-medium">Choose an outfit for {new Date(picking + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
              <button onClick={() => setPicking(null)} aria-label="Close"><X className="size-5" /></button>
            </div>
            {outfits.length === 0 ? (
              <p className="mt-6 text-sm text-fg-muted">No saved outfits yet — use Auto, or build one in the <Link className="text-accent" href="/try-on">Try-On studio</Link>.</p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {outfits.map((o) => {
                  const its = o.item_ids.map((id) => itemById.get(id)).filter((x): x is ItemWithImage => !!x);
                  return (
                    <button key={o.id} onClick={() => run(() => setPlan(picking, o.id), `Planned ${o.name}`)} className="rounded-2xl p-1 text-left hover:bg-surface" disabled={pending}>
                      <div className="rounded-xl bg-surface-2/60">
                        <OutfitCanvas items={its} layout={o.layout} avatar={avatar} className="mx-auto w-3/4" />
                      </div>
                      <p className="mt-1 truncate text-xs">{o.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

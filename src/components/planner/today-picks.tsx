"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, CloudRain, Loader2, Shuffle, Sparkles, Sun } from "lucide-react";
import { ItemImage } from "@/components/closet/item-image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { generateOutfits } from "@/lib/outfit-engine";
import { fmtTemp, layeringAdvice, type Weather } from "@/lib/weather";
import { logWear, undoWear } from "@/app/(app)/closet/actions";
import { planCombo } from "@/app/(app)/planner/actions";
import type { ItemWithImage } from "@/lib/types";

type Pick = { items: ItemWithImage[]; score: number; key: string };

export function TodayPicks({
  items,
  weather,
  units,
  palette,
  tomorrow,
  count = 3,
}: {
  items: ItemWithImage[];
  weather: Weather | null;
  units: "metric" | "imperial";
  palette: { best: string[]; avoid: string[] };
  tomorrow: string;
  count?: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [pending, start] = useTransition();

  function regenerate() {
    setPicks(
      generateOutfits(
        items,
        { tempC: weather?.feelsC ?? null, rain: weather?.rain, bestColors: palette.best, avoidColors: palette.avoid },
        count,
      ),
    );
  }

  // Generate on the client only (random), after mount
  useEffect(regenerate, [items, weather]); // eslint-disable-line react-hooks/exhaustive-deps

  function wear(p: Pick) {
    start(async () => {
      const r = await logWear(p.items.map((i) => i.id));
      if ("error" in r && r.error) return toast(r.error, { tone: "error" });
      const logId = (r as { logId: string }).logId;
      toast("Logged as today's outfit — have a great day", { action: { label: "Undo", onClick: () => undoWear(logId).then(() => router.refresh()) } });
      router.refresh();
    });
  }

  function planTomorrow(p: Pick) {
    start(async () => {
      const r = await planCombo(tomorrow, p.items.map((i) => i.id), `${p.items[0].name} look`);
      if ("error" in r && r.error) toast(r.error, { tone: "error" });
      else {
        toast("Planned for tomorrow");
        router.refresh();
      }
    });
  }

  return (
    <div>
      {weather && (
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-3xl bg-surface/60 p-4">
          <div className="flex items-center gap-3">
            {weather.rain ? <CloudRain className="size-8 text-accent" /> : <Sun className="size-8 text-accent" />}
            <div>
              <p className="font-display text-3xl leading-none">{fmtTemp(weather.tempC, units)}</p>
              <p className="text-xs text-fg-subtle">
                {weather.description} · feels {fmtTemp(weather.feelsC, units)}
              </p>
            </div>
          </div>
          <p className="min-w-0 flex-1 text-sm text-fg-muted">{layeringAdvice(weather)}</p>
        </div>
      )}

      {picks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">
          Add at least one clean top and bottom (or a dress) to get daily outfit picks.{" "}
          <Link href="/closet/add" className="text-accent hover:underline">Add items</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {picks.map((p, idx) => (
            <div key={p.key} className="rounded-3xl border border-border bg-surface/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{idx === 0 ? "Top pick" : `Option ${idx + 1}`}</p>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">{p.score}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {p.items.slice(0, 6).map((i) => (
                  <Link key={i.id} href={`/closet/${i.id}`} title={i.name}>
                    <ItemImage src={i.image_url} alt={i.name} tint={i.colors[0]} className="aspect-[3/4] rounded-xl" />
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button size="sm" onClick={() => wear(p)} disabled={pending}>
                  {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Wear today
                </Button>
                <Button size="sm" variant="ghost" onClick={() => planTomorrow(p)} disabled={pending} title="Plan for tomorrow">
                  <CalendarPlus className="size-3.5" />
                </Button>
                <Link href={`/try-on?items=${p.items.map((i) => i.id).join(",")}`} className="inline-flex h-9 items-center rounded-full px-3 text-sm text-fg-muted hover:bg-surface hover:text-fg" title="Try on">
                  <Sparkles className="size-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      {picks.length > 0 && (
        <button onClick={regenerate} className="mt-3 flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
          <Shuffle className="size-4" /> New ideas
        </button>
      )}
    </div>
  );
}

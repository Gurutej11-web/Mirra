import Link from "next/link";
import { Luggage } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCloset } from "@/lib/storage";
import { getWeather } from "@/lib/weather";
import { todayISO } from "@/lib/closet-utils";
import { Planner } from "@/components/planner/planner";
import type { Outfit, PlannerEntry } from "@/lib/types";

export const metadata = { title: "Planner" };

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ outfit?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await getSession();
  const today = todayISO();
  const end = addDays(today, 6);

  const [{ items }, { data: outfits }, { data: entries }, { data: wears }, weather] = await Promise.all([
    getCloset(supabase),
    supabase.from("outfits").select("*").order("created_at", { ascending: false }),
    supabase.from("planner_entries").select("*").gte("day", today).lte("day", end),
    supabase.from("wear_log").select("outfit_id, item_ids, worn_on").gte("worn_on", addDays(today, -14)),
    profile?.location ? getWeather(profile.location.lat, profile.location.lon, 7) : Promise.resolve(null),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-tight md:text-6xl">Planner</h1>
          <p className="mt-2 text-sm text-fg-muted">Weather-aware picks for today, and a plan for the week.</p>
        </div>
        <Link href="/planner/packing" className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm hover:bg-surface">
          <Luggage className="size-4" /> Packing lists
        </Link>
      </div>
      <Planner
        days={days}
        items={items}
        outfits={(outfits ?? []) as Outfit[]}
        entries={(entries ?? []) as PlannerEntry[]}
        recentWears={(wears ?? []) as { outfit_id: string | null; item_ids: string[]; worn_on: string }[]}
        weather={weather}
        units={profile?.units ?? "imperial"}
        location={profile?.location?.name ?? null}
        palette={{ best: profile?.palette?.best ?? [], avoid: profile?.palette?.avoid ?? [] }}
        avatar={profile?.avatar_config ?? {}}
        focusOutfitId={sp.outfit && /^[0-9a-f-]{36}$/i.test(sp.outfit) ? sp.outfit : null}
      />
    </section>
  );
}

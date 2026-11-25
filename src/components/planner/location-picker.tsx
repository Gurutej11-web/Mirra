"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { geocode, type Place } from "@/lib/weather";
import { saveSettings } from "@/app/(app)/profile/actions";
import { useToast } from "@/components/ui/toast";

export function LocationPicker({ current, onPicked }: { current?: string | null; onPicked?: (p: Place) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, start] = useTransition();

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setResults(await geocode(q));
    setSearching(false);
  }

  function choose(p: Place) {
    if (onPicked) return onPicked(p);
    start(async () => {
      const r = await saveSettings({ location: { name: p.name.slice(0, 80), lat: p.lat, lon: p.lon } });
      if ("error" in r && r.error) toast(r.error, { tone: "error" });
      else {
        toast(`Weather set to ${p.name}`);
        setResults([]);
        setQ("");
        router.refresh();
      }
    });
  }

  function useGps() {
    if (!navigator.geolocation) return toast("Location isn't available in this browser.", { tone: "error" });
    navigator.geolocation.getCurrentPosition(
      (pos) => choose({ name: "My location", lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3) }),
      () => toast("Couldn't get your location — search for your city instead.", { tone: "error" }),
      { timeout: 10_000 },
    );
  }

  return (
    <div>
      {current && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-fg-subtle">
          <MapPin className="size-3.5" /> {current}
        </p>
      )}
      <form onSubmit={search} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your city"
          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
        />
        <button type="submit" aria-label="Search" className="grid size-10 place-items-center rounded-xl border border-border hover:bg-surface">
          {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </button>
        <button type="button" onClick={useGps} aria-label="Use my location" title="Use my location" className="grid size-10 place-items-center rounded-xl border border-border hover:bg-surface">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
        </button>
      </form>
      {results.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-border">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button onClick={() => choose(r)} className="w-full px-3 py-2 text-left text-sm hover:bg-surface">
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

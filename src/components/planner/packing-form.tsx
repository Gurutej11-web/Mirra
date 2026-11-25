"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/planner/location-picker";
import { postJSON } from "@/lib/upload";
import { todayISO } from "@/lib/closet-utils";
import type { Place } from "@/lib/weather";
import { cn } from "@/lib/utils";

const ACTIVITIES = ["Sightseeing", "Beach", "Hiking", "Business", "Nights out", "Wedding", "Skiing", "Gym", "Fancy dinner", "Museums"];

export function PackingForm() {
  const router = useRouter();
  const [place, setPlace] = useState<Place | null>(null);
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [acts, setActs] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!place) return setError("Choose a destination first.");
    if (end < start) return setError("The end date is before the start date.");
    setError(null);
    setBusy(true);
    try {
      const r = await postJSON<{ id: string }>("/api/packing", { destination: place, start, end, activities: acts, notes: notes || undefined });
      router.push(`/planner/packing/${r.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const input = "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-accent";

  return (
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-border bg-surface/40 p-5">
      <div>
        <p className="mb-2 text-sm text-fg-muted">Where to?</p>
        {place ? (
          <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5 text-sm">
            <span className="flex items-center gap-2"><MapPin className="size-4 text-accent" /> {place.name}</span>
            <button type="button" onClick={() => setPlace(null)} aria-label="Change destination"><X className="size-4 text-fg-subtle" /></button>
          </div>
        ) : (
          <LocationPicker onPicked={setPlace} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5 text-sm text-fg-muted">
          From
          <input type="date" className={input} value={start} min={todayISO()} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="space-y-1.5 text-sm text-fg-muted">
          To
          <input type="date" className={input} value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm text-fg-muted">What are you doing?</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => setActs(acts.includes(a) ? acts.filter((x) => x !== a) : [...acts, a])}
              className={cn("rounded-full border px-3 py-1.5 text-sm", acts.includes(a) ? "border-accent bg-accent/15" : "border-border text-fg-muted")}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <textarea className={cn(input, "h-20 py-2.5")} placeholder="Anything else? e.g. carry-on only" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {busy ? "Packing your bag…" : "Build my packing list"}
      </Button>
    </form>
  );
}

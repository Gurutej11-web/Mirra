"use client";

import { useRef, useState } from "react";
import { Crown, ImagePlus, Loader2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image";
import { postForm } from "@/lib/upload";
import { OCCASIONS } from "@/lib/style";
import { cn } from "@/lib/utils";

type Side = { score: number; pros: string[]; cons: string[] };
type Result = { winner: "A" | "B" | "tie"; confidence: number; headline: string; a: Side; b: Side; tip: string };

export function WhichOne() {
  const [a, setA] = useState<Blob | null>(null);
  const [b, setB] = useState<Blob | null>(null);
  const [occasion, setOccasion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const refA = useRef<HTMLInputElement>(null);
  const refB = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined, set: (b: Blob) => void) {
    if (!file) return;
    try {
      set(await compressImage(file, { max: 1100 }));
      setRes(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function decide() {
    if (!a || !b) return;
    setBusy(true);
    setError(null);
    try {
      const f = new FormData();
      f.append("a", a, "a.jpg");
      f.append("b", b, "b.jpg");
      f.append("occasion", occasion);
      setRes(await postForm<Result>("/api/tools/compare", f));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const slot = (label: "A" | "B", blob: Blob | null, ref: React.RefObject<HTMLInputElement | null>, set: (b: Blob) => void, side?: Side) => (
    <div>
      <button onClick={() => ref.current?.click()} className={cn("relative block aspect-[3/4] w-full overflow-hidden rounded-3xl border bg-surface", res?.winner === label ? "border-accent ring-2 ring-accent" : "border-border")}>
        {blob ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={URL.createObjectURL(blob)} alt={`Option ${label}`} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full place-items-center text-fg-subtle">
            <span className="text-center">
              <ImagePlus className="mx-auto size-8" />
              <span className="mt-2 block text-sm">Option {label}</span>
            </span>
          </span>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-bg/80 px-2.5 py-0.5 font-display text-xl backdrop-blur">{label}</span>
        {res?.winner === label && <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-accent text-accent-fg"><Crown className="size-5" /></span>}
      </button>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { pick(e.target.files?.[0], set); e.target.value = ""; }} />
      {side && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="font-display text-3xl">{side.score}</p>
          {side.pros.map((p) => <p key={p} className="text-success">+ {p}</p>)}
          {side.cons.map((p) => <p key={p} className="text-fg-muted">− {p}</p>)}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-fg-muted">Can&apos;t decide? Snap both options and let Mirra pick.</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {slot("A", a, refA, setA, res?.a)}
        {slot("B", b, refB, setB, res?.b)}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {OCCASIONS.map((o) => (
          <button key={o} onClick={() => setOccasion(occasion === o ? "" : o)} className={cn("rounded-full border px-3 py-1.5 text-sm", occasion === o ? "border-accent bg-accent/15" : "border-border text-fg-muted")}>
            {o}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      <Button className="mt-6" size="lg" disabled={!a || !b || busy} onClick={decide}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Scale className="size-4" />} {busy ? "Deciding…" : "Pick the winner"}
      </Button>
      {res && (
        <div className="mt-6 rounded-3xl bg-surface/60 p-5">
          <p className="font-display text-3xl">{res.winner === "tie" ? "It's a tie!" : `Option ${res.winner} wins`}</p>
          <p className="mt-1 text-fg-muted">{res.headline}</p>
          {res.tip && <p className="mt-3 text-sm">💡 {res.tip}</p>}
        </div>
      )}
    </div>
  );
}

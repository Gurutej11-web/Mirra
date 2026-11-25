"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Wand2, X } from "lucide-react";
import { ItemImage } from "@/components/closet/item-image";
import { Button } from "@/components/ui/button";
import { scoreOutfit } from "@/lib/outfit-engine";
import { pairScore } from "@/lib/colors";
import { CATEGORY_LABELS, type ItemWithImage } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Every valid outfit (top+bottom+shoes / dress+shoes, optional outerwear) from the selected pieces. */
function combos(sel: ItemWithImage[], palette: { best: string[]; avoid: string[] }) {
  const by = (c: string) => sel.filter((i) => i.category === c);
  const tops = by("top"), bottoms = by("bottom"), dresses = by("dress"), shoes = by("shoes"), outer = by("outerwear");
  const shoeOpts = shoes.length ? shoes : [null];
  const outerOpts = [null, ...outer];
  const out: { items: ItemWithImage[]; score: number }[] = [];
  const push = (arr: (ItemWithImage | null)[]) => {
    const items = arr.filter((x): x is ItemWithImage => !!x);
    out.push({ items, score: scoreOutfit(items, { bestColors: palette.best, avoidColors: palette.avoid, allowDirty: true }) });
  };
  for (const t of tops)
    for (const b of bottoms) {
      if (t.colors[0] && b.colors[0] && pairScore(t.colors[0], b.colors[0]) < 50) continue;
      for (const s of shoeOpts) for (const o of outerOpts) push([t, b, s, o]);
    }
  for (const d of dresses) for (const s of shoeOpts) for (const o of outerOpts) push([d, s, o]);
  return out.sort((a, b) => b.score - a.score);
}

export function CapsuleBuilder({ items, palette }: { items: ItemWithImage[]; palette: { best: string[]; avoid: string[] } }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [show, setShow] = useState(12);
  const sel = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected]);
  const results = useMemo(() => combos(sel, palette), [sel, palette]);
  const good = results.filter((r) => r.score >= 60);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size < 20) n.add(id);
      return n;
    });
  }

  /** Auto-pick a versatile 10-piece capsule: mostly neutrals + most-worn favorites. */
  function autoPick() {
    const quota: Record<string, number> = { top: 4, bottom: 3, shoes: 2, outerwear: 1 };
    const pick: string[] = [];
    for (const [cat, n] of Object.entries(quota)) {
      const cands = items
        .filter((i) => i.category === cat)
        .sort((a, b) => b.times_worn + (b.favorite ? 3 : 0) - (a.times_worn + (a.favorite ? 3 : 0)));
      pick.push(...cands.slice(0, n).map((i) => i.id));
    }
    setSelected(new Set(pick));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-fg-muted">Pick up to 20 pieces ({selected.size} selected)</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={autoPick}><Wand2 className="size-3.5" /> Auto 10</Button>
            {selected.size > 0 && <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="size-3.5" /> Clear</Button>}
          </div>
        </div>
        {(["top", "bottom", "dress", "shoes", "outerwear"] as const).map((cat) => {
          const list = items.filter((i) => i.category === cat);
          if (!list.length) return null;
          return (
            <div key={cat} className="mt-5">
              <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle">{CATEGORY_LABELS[cat]}</p>
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {list.map((i) => (
                  <button key={i.id} onClick={() => toggle(i.id)} aria-pressed={selected.has(i.id)} title={i.name} className={cn("rounded-xl transition", selected.has(i.id) ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : "opacity-70 hover:opacity-100")}>
                    <ItemImage src={i.image_url} alt={i.name} tint={i.colors[0]} className="aspect-square rounded-xl" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {!items.length && <p className="mt-6 text-sm text-fg-muted">Add clothes to your closet to build a capsule.</p>}
      </div>

      <div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { v: selected.size, l: "Pieces" },
            { v: good.length, l: "Good outfits" },
            { v: selected.size ? (good.length / selected.size).toFixed(1) : "0", l: "Outfits per piece" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-surface p-4">
              <p className="font-display text-4xl">{s.v}</p>
              <p className="text-xs text-fg-subtle">{s.l}</p>
            </div>
          ))}
        </div>
        {sel.length > 0 && good.length === 0 && (
          <p className="mt-6 text-sm text-fg-muted">Add at least one top and one bottom (or a dress) to start making outfits.</p>
        )}
        <div className="mt-6 space-y-3">
          {good.slice(0, show).map((r, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-2xl border border-border p-3">
              <div className="flex flex-1 gap-2 overflow-x-auto">
                {r.items.map((i) => (
                  <ItemImage key={i.id} src={i.image_url} alt={i.name} tint={i.colors[0]} className="aspect-[3/4] w-14 shrink-0 rounded-lg" />
                ))}
              </div>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">{r.score}</span>
              <Link href={`/try-on?items=${r.items.map((i) => i.id).join(",")}`} className="grid size-9 place-items-center rounded-full hover:bg-surface" title="Try on">
                <Sparkles className="size-4 text-accent" />
              </Link>
            </div>
          ))}
        </div>
        {good.length > show && <Button variant="ghost" className="mt-3" onClick={() => setShow(show + 24)}>Show more ({good.length - show})</Button>}
      </div>
    </div>
  );
}

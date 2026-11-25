"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { ItemImage } from "@/components/closet/item-image";
import { colorDistance, colorName, harmonies, normalizeHex, outfitHarmony, pairScore } from "@/lib/colors";
import type { ItemWithImage } from "@/lib/types";

function verdict(s: number) {
  if (s >= 85) return "Effortless — these sing together.";
  if (s >= 72) return "Works well. Confident pairing.";
  if (s >= 58) return "Can work — balance it with a neutral.";
  return "Risky. Separate them with a neutral or swap one.";
}

export function ColorLab({ items, palette }: { items: ItemWithImage[]; palette: { best: string[]; avoid: string[] } }) {
  const [colors, setColors] = useState<string[]>(["#1f2a44", "#c19a6b"]);
  const score = outfitHarmony(colors);

  const matches = useMemo(
    () =>
      colors.map((c) =>
        items
          .filter((i) => i.colors[0])
          .map((i) => ({ i, d: colorDistance(i.colors[0], c) }))
          .filter((x) => x.d < 25)
          .sort((a, b) => a.d - b.d)
          .slice(0, 6)
          .map((x) => x.i),
      ),
    [colors, items],
  );

  const set = (idx: number, hex: string) => setColors((cs) => cs.map((c, i) => (i === idx ? hex : c)));
  const inBest = (c: string) => palette.best.some((b) => colorDistance(b, c) < 22);
  const inAvoid = (c: string) => palette.avoid.some((b) => colorDistance(b, c) < 18);
  const sug = harmonies(colors[0]);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <p className="text-sm text-fg-muted">Build a color combo (up to 4) — tap a swatch to change it.</p>
        <div className="mt-4 flex h-40 overflow-hidden rounded-3xl border border-border">
          {colors.map((c, idx) => (
            <label key={idx} className="relative flex-1 cursor-pointer" style={{ background: c }} title={colorName(c)}>
              <input type="color" value={c} onChange={(e) => set(idx, normalizeHex(e.target.value) ?? c)} className="absolute inset-0 cursor-pointer opacity-0" />
              {colors.length > 2 && (
                <button
                  onClick={(e) => { e.preventDefault(); setColors(colors.filter((_, i) => i !== idx)); }}
                  aria-label="Remove color"
                  className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/40 text-white"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {colors.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs capitalize">
              <span className="size-3 rounded-full" style={{ background: c }} /> {colorName(c)}
              {inBest(c) && <span className="text-success">· your color</span>}
              {inAvoid(c) && <span className="text-warning">· tricky for you</span>}
            </span>
          ))}
          {colors.length < 4 && (
            <button onClick={() => setColors([...colors, sug.complementary[0]])} className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs text-fg-muted hover:text-fg">
              <Plus className="size-3" /> Add color
            </button>
          )}
        </div>

        <div className="mt-6 rounded-3xl bg-surface/60 p-5">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-6xl text-accent">{score}</span>
            <span className="text-sm text-fg-muted">harmony</span>
          </div>
          <p className="mt-1">{verdict(score)}</p>
          {colors.length > 2 && (
            <ul className="mt-3 space-y-1 text-xs text-fg-muted">
              {colors.flatMap((a, i) => colors.slice(i + 1).map((b, j) => (
                <li key={`${i}-${j}`} className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: a }} />+<span className="size-3 rounded-full" style={{ background: b }} /> {pairScore(a, b)}
                </li>
              )))}
            </ul>
          )}
        </div>

        <p className="mt-6 text-sm font-medium">Ideas for {colorName(colors[0])}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(sug).map(([k, list]) => (
            <button key={k} onClick={() => setColors([colors[0], ...list].slice(0, 4))} className="rounded-2xl bg-surface p-2 text-left hover:bg-surface-2">
              <div className="flex h-8 overflow-hidden rounded-lg">
                {[colors[0], ...list].map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
              </div>
              <p className="mt-1 text-[11px] capitalize text-fg-subtle">{k}</p>
            </button>
          ))}
        </div>
        {palette.best.length > 0 && (
          <>
            <p className="mt-6 text-sm font-medium">Your palette</p>
            <div className="mt-2 flex gap-1.5">
              {palette.best.map((c) => (
                <button key={c} onClick={() => colors.length < 4 && setColors([...colors, c])} title={colorName(c)} className="h-8 flex-1 rounded-lg border border-white/10" style={{ background: c }} />
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <p className="text-sm font-medium">In your closet</p>
        {colors.map((c, idx) => (
          <div key={idx} className="mt-4">
            <p className="flex items-center gap-2 text-xs capitalize text-fg-subtle"><span className="size-3 rounded-full" style={{ background: c }} /> {colorName(c)}</p>
            {matches[idx].length ? (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {matches[idx].map((i) => (
                  <Link key={i.id} href={`/closet/${i.id}`} className="w-16 shrink-0" title={i.name}>
                    <ItemImage src={i.image_url} alt={i.name} tint={i.colors[0]} className="aspect-[3/4] rounded-lg" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-fg-muted">Nothing close in your closet.</p>
            )}
          </div>
        ))}
        {matches.every((m) => m.length) && (
          <Link
            href={`/try-on?items=${matches.map((m) => m[0].id).join(",")}`}
            className="mt-6 inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-fg"
          >
            Try this combo on
          </Link>
        )}
      </div>
    </div>
  );
}

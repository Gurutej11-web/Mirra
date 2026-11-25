"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Check, Droplets, ExternalLink, Heart, Loader2, Pencil, Shirt, Sparkles, Trash2, WashingMachine } from "lucide-react";
import { ItemImage } from "@/components/closet/item-image";
import { ItemForm } from "@/components/closet/item-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { deleteItems, logWear, patchItems, undoWear, updateItem } from "@/app/(app)/closet/actions";
import { costPerWear, daysSince, money } from "@/lib/closet-utils";
import { colorName, harmonies } from "@/lib/colors";
import { CATEGORY_LABELS, type Item } from "@/lib/types";
import type { ItemInput } from "@/lib/item-schema";
import { cn } from "@/lib/utils";

type Pair = { id: string; name: string; image_url: string | null; color: string | null };

const STATUS_LABEL = { clean: "Clean", dirty: "In laundry", dry_cleaning: "At dry cleaner" } as const;

function toInput(i: Item): ItemInput {
  return {
    name: i.name,
    category: i.category,
    subcategory: i.subcategory,
    colors: i.colors,
    pattern: i.pattern,
    material: i.material,
    formality: i.formality,
    seasons: i.seasons,
    tags: i.tags,
    brand: i.brand,
    price: i.price,
    source_url: i.source_url,
    purchased_on: i.purchased_on,
    notes: i.notes,
    wear_goal: i.wear_goal,
  };
}

export function ItemDetail({
  item,
  originalUrl,
  cutoutUrl,
  pairs,
  outfits,
  wearDates,
}: {
  item: Item;
  originalUrl: string | null;
  cutoutUrl: string | null;
  pairs: Pair[];
  outfits: { id: string; name: string }[];
  wearDates: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ItemInput>(toInput(item));
  const [showOriginal, setShowOriginal] = useState(false);

  const cpw = costPerWear(item);
  const idle = daysSince(item.last_worn ?? item.created_at);
  const goalPct = item.wear_goal ? Math.min(100, Math.round((item.times_worn / item.wear_goal) * 100)) : null;

  function run(fn: () => Promise<{ error?: string } | { ok: boolean }>, msg: string, after?: () => void) {
    start(async () => {
      const res = await fn();
      if ("error" in res && res.error) toast(res.error, { tone: "error" });
      else {
        toast(msg);
        after?.();
        router.refresh();
      }
    });
  }

  function wearToday() {
    start(async () => {
      const res = await logWear([item.id]);
      if ("error" in res && res.error) return toast(res.error, { tone: "error" });
      const logId = (res as { logId: string }).logId;
      toast("Logged as worn today", { action: { label: "Undo", onClick: () => undoWear(logId).then(() => router.refresh()) } });
      router.refresh();
    });
  }

  const companions = item.colors[0] ? harmonies(item.colors[0]) : null;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div>
        <ItemImage
          src={showOriginal ? originalUrl : (cutoutUrl ?? originalUrl)}
          alt={item.name}
          tint={item.colors[0]}
          className="aspect-[3/4] rounded-[2rem]"
        />
        {cutoutUrl && originalUrl && (
          <button className="mt-2 text-xs text-fg-muted hover:text-fg" onClick={() => setShowOriginal(!showOriginal)}>
            {showOriginal ? "Show cutout" : "Show original photo"}
          </button>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Worn", value: `${item.times_worn}×` },
            { label: "Cost / wear", value: money(cpw) },
            { label: "Last worn", value: item.last_worn ? (idle === 0 ? "Today" : `${idle}d ago`) : "Never" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-surface p-3">
              <p className="font-display text-2xl">{s.value}</p>
              <p className="text-[11px] text-fg-subtle">{s.label}</p>
            </div>
          ))}
        </div>

        {goalPct != null && (
          <div className="mt-3 rounded-2xl bg-surface p-4">
            <div className="flex justify-between text-xs text-fg-muted">
              <span>Wear goal</span>
              <span>
                {item.times_worn} / {item.wear_goal}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${goalPct}%` }} />
            </div>
            {goalPct >= 100 && <p className="mt-2 text-xs text-success">Goal reached — this piece has earned its keep.</p>}
          </div>
        )}

        {wearDates.length > 0 && (
          <div className="mt-3 rounded-2xl bg-surface p-4">
            <p className="text-xs text-fg-muted">Wear history</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {wearDates.slice(0, 20).map((d, i) => (
                <span key={`${d}-${i}`} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-fg-muted">
                  {new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle">
              {CATEGORY_LABELS[item.category]}
              {item.subcategory && ` · ${item.subcategory}`}
            </p>
            <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">{item.name}</h1>
            {item.brand && <p className="mt-1 text-fg-muted">{item.brand}</p>}
          </div>
          <button
            aria-label={item.favorite ? "Unfavorite" : "Favorite"}
            onClick={() => run(() => patchItems([item.id], { favorite: !item.favorite }), item.favorite ? "Removed from favorites" : "Added to favorites")}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-border hover:bg-surface"
          >
            <Heart className={cn("size-5", item.favorite ? "fill-accent text-accent" : "text-fg-muted")} />
          </button>
        </div>

        {/* quick actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={wearToday} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Wore it today
          </Button>
          <Link
            href={`/try-on?with=${item.id}`}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm hover:bg-surface"
          >
            <Sparkles className="size-4" /> Style it
          </Link>
          <Button variant="secondary" onClick={() => setEditing(!editing)}>
            <Pencil className="size-4" /> {editing ? "Cancel" : "Edit"}
          </Button>
        </div>

        {/* laundry */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-subtle">Status:</span>
          {(["clean", "dirty", "dry_cleaning"] as const).map((s) => (
            <button
              key={s}
              onClick={() => item.status !== s && run(() => patchItems([item.id], { status: s }), `Marked ${STATUS_LABEL[s].toLowerCase()}`)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                item.status === s ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted hover:text-fg",
              )}
            >
              {s === "clean" ? <Shirt className="size-3" /> : s === "dirty" ? <Droplets className="size-3" /> : <WashingMachine className="size-3" />}
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {editing ? (
          <Card className="mt-6">
            <ItemForm value={draft} onChange={setDraft} />
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setDraft(toInput(item)); setEditing(false); }}>
                Cancel
              </Button>
              <Button
                disabled={pending || !draft.name.trim()}
                onClick={() => run(() => updateItem(item.id, draft), "Saved", () => setEditing(false))}
              >
                {pending && <Loader2 className="size-4 animate-spin" />} Save changes
              </Button>
            </div>
          </Card>
        ) : (
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
            <Detail label="Colors">
              <div className="flex flex-wrap gap-1.5">
                {item.colors.length ? item.colors.map((c) => (
                  <span key={c} className="flex items-center gap-1.5 capitalize">
                    <span className="size-3.5 rounded-full border border-white/15" style={{ background: c }} />
                    {colorName(c)}
                  </span>
                )) : "—"}
              </div>
            </Detail>
            <Detail label="Pattern">{item.pattern ?? "—"}</Detail>
            <Detail label="Material">{item.material ?? "—"}</Detail>
            <Detail label="Formality">{item.formality ? ["Lounge", "Casual", "Smart", "Dressy", "Formal"][item.formality - 1] : "—"}</Detail>
            <Detail label="Seasons">{item.seasons.length ? item.seasons.join(", ") : "All year"}</Detail>
            <Detail label="Price">{money(item.price)}</Detail>
            {item.purchased_on && <Detail label="Bought">{new Date(item.purchased_on + "T00:00:00").toLocaleDateString()}</Detail>}
            {item.tags.length > 0 && (
              <Detail label="Tags" className="col-span-2 sm:col-span-3">
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <span key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs">{t}</span>
                  ))}
                </div>
              </Detail>
            )}
            {item.notes && <Detail label="Notes & care" className="col-span-2 sm:col-span-3">{item.notes}</Detail>}
            {item.source_url && (
              <Detail label="Source" className="col-span-2 sm:col-span-3">
                <a href={item.source_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-accent hover:underline">
                  View product <ExternalLink className="size-3" />
                </a>
              </Detail>
            )}
          </dl>
        )}

        {/* goes with */}
        {pairs.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-medium">Goes well with</h2>
            <p className="text-xs text-fg-subtle">Picked from your closet by color harmony, formality and season.</p>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {pairs.map((p) => (
                <Link key={p.id} href={`/closet/${p.id}`} className="w-28 shrink-0">
                  <ItemImage src={p.image_url} alt={p.name} tint={p.color ?? undefined} className="aspect-[3/4] rounded-xl" />
                  <p className="mt-1 truncate text-xs text-fg-muted">{p.name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {companions && (
          <div className="mt-8">
            <h2 className="text-lg font-medium">Color companions</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(companions).map(([k, list]) => (
                <div key={k} className="rounded-2xl bg-surface p-3">
                  <p className="text-xs capitalize text-fg-subtle">{k}</p>
                  <div className="mt-2 flex gap-1.5">
                    <span className="h-8 flex-1 rounded-lg" style={{ background: item.colors[0] }} />
                    {list.map((c) => (
                      <span key={c} title={colorName(c)} className="h-8 flex-1 rounded-lg" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {outfits.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium">In {outfits.length} saved outfit{outfits.length === 1 ? "" : "s"}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {outfits.map((o) => (
                <Link key={o.id} href={`/outfits/${o.id}`} className="rounded-full border border-border px-3 py-1 text-sm text-fg-muted hover:text-fg">
                  {o.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-wrap gap-2 border-t border-border pt-6">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(() => patchItems([item.id], { archived: !item.archived }), item.archived ? "Restored to closet" : "Archived")}
          >
            {item.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {item.archived ? "Restore" : "Archive (donated / stored)"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            disabled={pending}
            onClick={() => {
              if (confirm(`Permanently delete "${item.name}" and its photos? This can't be undone.`))
                run(() => deleteItems([item.id]), "Deleted", () => router.push("/closet"));
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="mt-1 capitalize-first">{children}</dd>
    </div>
  );
}

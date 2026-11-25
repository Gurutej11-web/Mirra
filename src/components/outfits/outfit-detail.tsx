"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Heart, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { OutfitCanvas, type CanvasItem } from "@/components/tryon/outfit-canvas";
import { ItemImage } from "@/components/closet/item-image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ShareCardButton } from "@/components/share/share-card-button";
import { deleteOutfit, patchOutfit } from "@/app/(app)/outfits/actions";
import { logWear, undoWear } from "@/app/(app)/closet/actions";
import type { AvatarConfig, Lookbook, Outfit } from "@/lib/types";
import { cn } from "@/lib/utils";

type Item = CanvasItem & { status: string };

export function OutfitDetail({
  outfit,
  items,
  avatar,
  lookbooks,
  score,
  hideScores,
  wearDates,
  missing,
}: {
  outfit: Outfit;
  items: Item[];
  avatar: AvatarConfig;
  lookbooks: Lookbook[];
  score: number | null;
  hideScores: boolean;
  wearDates: string[];
  missing: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ error?: string } | { ok: boolean }>, msg: string, after?: () => void) {
    start(async () => {
      const r = await fn();
      if ("error" in r && r.error) toast(r.error, { tone: "error" });
      else {
        toast(msg);
        after?.();
        router.refresh();
      }
    });
  }

  function wear() {
    start(async () => {
      const r = await logWear(items.map((i) => i.id), outfit.id);
      if ("error" in r && r.error) return toast(r.error, { tone: "error" });
      const logId = (r as { logId: string }).logId;
      toast("Logged as today's outfit", { action: { label: "Undo", onClick: () => undoWear(logId).then(() => router.refresh()) } });
      router.refresh();
    });
  }

  const lastWorn = wearDates[0];
  const dirty = items.filter((i) => i.status !== "clean");

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="rounded-[2rem] border border-border bg-[radial-gradient(circle_at_50%_30%,var(--surface-2),var(--bg-elevated))] p-4">
        <OutfitCanvas items={items} layout={outfit.layout} avatar={avatar} className="mx-auto w-full max-w-[320px]" />
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            {outfit.occasion && <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle">{outfit.occasion}</p>}
            <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">{outfit.name}</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {lastWorn
                ? `Worn ${wearDates.length}× · last on ${new Date(lastWorn + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : "Never worn yet"}
            </p>
          </div>
          {!hideScores && score != null && (
            <div className="shrink-0 text-center">
              <p className="font-display text-5xl text-accent">{score}</p>
              <p className="text-[11px] text-fg-subtle">Harmony</p>
            </div>
          )}
        </div>

        {missing > 0 && (
          <p className="mt-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
            {missing} piece{missing === 1 ? " was" : "s were"} deleted from your closet since this was saved.
          </p>
        )}
        {dirty.length > 0 && (
          <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-fg-muted">
            Heads up: {dirty.map((d) => d.name).join(", ")} {dirty.length === 1 ? "is" : "are"} in the laundry.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={wear} disabled={pending || !items.length}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Wearing it today
          </Button>
          <Link href={`/try-on?outfit=${outfit.id}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm hover:bg-surface">
            <Pencil className="size-4" /> Edit
          </Link>
          <Link href={`/planner?outfit=${outfit.id}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm hover:bg-surface">
            <CalendarPlus className="size-4" /> Plan
          </Link>
          <Link href={`/fit-check?outfit=${outfit.id}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm hover:bg-surface">
            <Sparkles className="size-4" /> Fit Check it
          </Link>
          <ShareCardButton
            title={outfit.name}
            subtitle={outfit.occasion ?? "Styled with Mirra"}
            score={hideScores ? null : score}
            images={items.map((i) => i.image_url).filter((x): x is string => !!x)}
          />
          <button
            aria-label={outfit.favorite ? "Unfavorite" : "Favorite"}
            onClick={() => run(() => patchOutfit(outfit.id, { favorite: !outfit.favorite }), outfit.favorite ? "Removed from favorites" : "Favorited")}
            className="grid size-11 place-items-center rounded-full border border-border hover:bg-surface"
          >
            <Heart className={cn("size-5", outfit.favorite ? "fill-accent text-accent" : "text-fg-muted")} />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-fg-muted">
            Lookbook
            <select
              className="h-9 rounded-xl border border-border bg-surface px-3 text-sm text-fg"
              value={outfit.lookbook_id ?? ""}
              onChange={(e) => run(() => patchOutfit(outfit.id, { lookbook_id: e.target.value || null }), "Moved")}
            >
              <option value="">None</option>
              {lookbooks.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>
          <button
            className="text-fg-muted hover:text-fg"
            onClick={() => {
              const n = prompt("Rename outfit", outfit.name);
              if (n?.trim()) run(() => patchOutfit(outfit.id, { name: n.trim().slice(0, 60) }), "Renamed");
            }}
          >
            Rename
          </button>
        </div>

        <h2 className="mt-10 text-lg font-medium">Pieces</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {items.map((i) => (
            <Link key={i.id} href={`/closet/${i.id}`}>
              <ItemImage src={i.image_url} alt={i.name} tint={i.colors[0]} className="aspect-[3/4] rounded-2xl" />
              <p className="mt-1 truncate text-xs text-fg-muted">{i.name}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete "${outfit.name}"? The clothes stay in your closet.`))
                run(() => deleteOutfit(outfit.id), "Outfit deleted", () => router.push("/outfits"));
            }}
          >
            <Trash2 className="size-4" /> Delete outfit
          </Button>
        </div>
      </div>
    </div>
  );
}

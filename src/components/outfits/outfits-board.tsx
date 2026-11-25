"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookPlus, Heart, Layers, Plus, Trash2 } from "lucide-react";
import { OutfitCanvas, type CanvasItem } from "@/components/tryon/outfit-canvas";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createLookbook, deleteLookbook } from "@/app/(app)/outfits/actions";
import type { AvatarConfig, Lookbook, Outfit } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OutfitsBoard({
  outfits,
  lookbooks,
  items,
  avatar,
}: {
  outfits: Outfit[];
  lookbooks: Lookbook[];
  items: CanvasItem[];
  avatar: AvatarConfig;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<string>("all");
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const shown = outfits.filter((o) =>
    filter === "all" ? true : filter === "fav" ? o.favorite : o.lookbook_id === filter,
  );

  function newLookbook() {
    const name = prompt("Lookbook name (e.g. Date night, Interview, Summer)");
    if (!name?.trim()) return;
    start(async () => {
      const r = await createLookbook(name);
      if ("error" in r && r.error) toast(r.error, { tone: "error" });
      else {
        toast("Lookbook created");
        router.refresh();
      }
    });
  }

  function removeLookbook(l: Lookbook) {
    if (!confirm(`Delete the "${l.name}" lookbook? Its outfits stay saved.`)) return;
    start(async () => {
      const r = await deleteLookbook(l.id);
      if ("error" in r && r.error) toast(r.error, { tone: "error" });
      else {
        setFilter("all");
        router.refresh();
      }
    });
  }

  if (!outfits.length) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center">
        <Layers className="mx-auto size-10 text-accent" />
        <p className="mt-4 font-display text-3xl">No outfits yet</p>
        <p className="mt-2 text-sm text-fg-muted">Build one in the Try-On studio, or ask the stylist for ideas.</p>
        <div className="mt-6 flex justify-center gap-2">
          <ButtonLink href="/try-on"><Plus className="size-4" /> Build an outfit</ButtonLink>
          <ButtonLink href="/stylist" variant="secondary">Ask the stylist</ButtonLink>
        </div>
      </div>
    );
  }

  const activeLookbook = lookbooks.find((l) => l.id === filter);

  return (
    <div className="mt-8">
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {[{ id: "all", name: `All ${outfits.length}` }, { id: "fav", name: "♥ Favorites" }, ...lookbooks].map((l) => (
          <button
            key={l.id}
            onClick={() => setFilter(l.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm",
              filter === l.id ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted hover:text-fg",
            )}
          >
            {l.name}
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={newLookbook} disabled={pending} className="shrink-0">
          <BookPlus className="size-4" /> Lookbook
        </Button>
        {activeLookbook && (
          <Button size="sm" variant="ghost" className="shrink-0 text-danger" onClick={() => removeLookbook(activeLookbook)}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="mt-10 text-center text-sm text-fg-muted">Nothing here yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((o) => {
            const its = o.item_ids.map((id) => byId.get(id)).filter((x): x is CanvasItem => !!x);
            return (
              <Link key={o.id} href={`/outfits/${o.id}`} className="group">
                <div className="overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_50%_30%,var(--surface-2),var(--bg-elevated))] p-2 transition-transform group-hover:-translate-y-0.5">
                  <OutfitCanvas items={its} layout={o.layout} avatar={avatar} className="mx-auto w-full" />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 px-1">
                  <p className="truncate text-sm">{o.name}</p>
                  {o.favorite && <Heart className="size-3.5 shrink-0 fill-accent text-accent" />}
                </div>
                {o.occasion && <p className="px-1 text-xs text-fg-subtle">{o.occasion}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

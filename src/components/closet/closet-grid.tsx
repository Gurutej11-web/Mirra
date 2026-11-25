"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckSquare,
  Droplets,
  Heart,
  LayoutGrid,
  Palette,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { ItemImage } from "@/components/closet/item-image";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { addTags, deleteItems, patchItems } from "@/app/(app)/closet/actions";
import { CATEGORIES, CATEGORY_LABELS, SEASONS, type ItemWithImage } from "@/lib/types";
import { COLOR_FAMILIES, FAMILY_SWATCH, colorFamily, hexToHsl, type ColorFamily } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { costPerWear, daysSince } from "@/lib/closet-utils";

type Sort = "newest" | "most_worn" | "least_worn" | "cpw" | "color" | "name";

const SORTS: { id: Sort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "most_worn", label: "Most worn" },
  { id: "least_worn", label: "Least worn" },
  { id: "cpw", label: "Cost per wear" },
  { id: "color", label: "Color" },
  { id: "name", label: "Name" },
];

const statusDot: Record<string, string> = { clean: "bg-success", dirty: "bg-warning", dry_cleaning: "bg-accent" };

export function ClosetGrid({ items }: { items: ItemWithImage[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [family, setFamily] = useState<ColorFamily | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [onlyFav, setOnlyFav] = useState(false);
  const [onlyNeglected, setOnlyNeglected] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<"grid" | "rainbow">("grid");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.category] = (c[i.category] ?? 0) + 1;
    return c;
  }, [items]);

  const familiesPresent = useMemo(
    () => COLOR_FAMILIES.filter((f) => items.some((i) => i.colors[0] && colorFamily(i.colors[0]) === f)),
    [items],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = items.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (family && !(i.colors[0] && colorFamily(i.colors[0]) === family)) return false;
      if (season && !i.seasons.includes(season as never)) return false;
      if (onlyFav && !i.favorite) return false;
      if (status && i.status !== status) return false;
      if (onlyNeglected && daysSince(i.last_worn ?? i.created_at.slice(0, 10)) < 30) return false;
      if (needle) {
        const hay = [i.name, i.subcategory, i.brand, i.material, i.pattern, ...i.tags].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const by: Record<Sort, (a: ItemWithImage, b: ItemWithImage) => number> = {
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      most_worn: (a, b) => b.times_worn - a.times_worn,
      least_worn: (a, b) => a.times_worn - b.times_worn,
      cpw: (a, b) => (costPerWear(b) ?? -1) - (costPerWear(a) ?? -1),
      color: (a, b) => hueKey(a) - hueKey(b),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return out.sort(by[view === "rainbow" ? "color" : sort]);
  }, [items, q, cat, family, season, onlyFav, status, onlyNeglected, sort, view]);

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function bulk(fn: () => Promise<{ error?: string } | { ok: boolean }>, message: string) {
    start(async () => {
      const res = await fn();
      if ("error" in res && res.error) toast(res.error, { tone: "error" });
      else {
        toast(message);
        setSelected(new Set());
        setSelecting(false);
        router.refresh();
      }
    });
  }

  const ids = [...selected];
  const activeFilters = [cat !== "all", family, season, onlyFav, onlyNeglected, status, q].filter(Boolean).length;

  if (!items.length) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center">
        <Sparkles className="mx-auto size-10 text-accent" />
        <h2 className="mt-4 font-display text-3xl">Your closet is empty — for now.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          Snap a few favorite pieces, one mirror selfie, or paste a product link. Most people start with 5–10 items.
        </p>
        <ButtonLink href="/closet/add" className="mt-6">
          <Plus className="size-4" /> Add your first piece
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Search + controls */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm outline-none focus:border-accent"
            placeholder="Search name, brand, tag…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <select
            aria-label="Sort"
            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            disabled={view === "rainbow"}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            aria-label={view === "grid" ? "Rainbow view" : "Grid view"}
            title={view === "grid" ? "Rainbow view" : "Grid view"}
            onClick={() => setView(view === "grid" ? "rainbow" : "grid")}
            className="grid size-11 place-items-center rounded-xl border border-border bg-surface text-fg-muted hover:text-fg"
          >
            {view === "grid" ? <Palette className="size-4" /> : <LayoutGrid className="size-4" />}
          </button>
          <button
            aria-pressed={selecting}
            title="Select multiple"
            onClick={() => {
              setSelecting(!selecting);
              setSelected(new Set());
            }}
            className={cn(
              "grid size-11 place-items-center rounded-xl border bg-surface",
              selecting ? "border-accent text-accent" : "border-border text-fg-muted hover:text-fg",
            )}
          >
            <CheckSquare className="size-4" />
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {["all", ...CATEGORIES].filter((c) => c === "all" || counts[c]).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
              cat === c ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted hover:text-fg",
            )}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS]}{" "}
            <span className="text-fg-subtle">{counts[c] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {familiesPresent.map((f) => (
          <button
            key={f}
            title={f}
            aria-label={`Filter ${f}`}
            aria-pressed={family === f}
            onClick={() => setFamily(family === f ? null : f)}
            className={cn(
              "size-7 rounded-full border border-white/15 transition",
              family === f && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
            )}
            style={{ background: FAMILY_SWATCH[f] }}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {SEASONS.map((s) => (
          <FilterChip key={s} on={season === s} onClick={() => setSeason(season === s ? null : s)}>
            {s}
          </FilterChip>
        ))}
        <FilterChip on={onlyFav} onClick={() => setOnlyFav(!onlyFav)}>
          <Heart className="size-3" /> favorites
        </FilterChip>
        <FilterChip on={onlyNeglected} onClick={() => setOnlyNeglected(!onlyNeglected)}>
          not worn in 30d
        </FilterChip>
        <FilterChip on={status === "dirty"} onClick={() => setStatus(status === "dirty" ? null : "dirty")}>
          <Droplets className="size-3" /> laundry
        </FilterChip>
        {activeFilters > 0 && (
          <button
            className="ml-1 text-xs text-fg-subtle hover:text-fg"
            onClick={() => {
              setQ("");
              setCat("all");
              setFamily(null);
              setSeason(null);
              setOnlyFav(false);
              setOnlyNeglected(false);
              setStatus(null);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-fg-subtle">
        {filtered.length} of {items.length} pieces
      </p>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-fg-muted">Nothing matches those filters.</p>
      ) : view === "rainbow" ? (
        <div className="mt-4 grid grid-cols-4 gap-1 sm:grid-cols-8 lg:grid-cols-12">
          {filtered.map((i) => (
            <Link
              key={i.id}
              href={`/closet/${i.id}`}
              title={i.name}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg"
              style={{ background: i.colors[0] ?? "var(--surface-2)" }}
            >
              {i.image_url && (
                 
                <img src={i.image_url} alt={i.name} loading="lazy" className="h-full w-full object-contain p-1 opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((i) => {
            const isSel = selected.has(i.id);
            const card = (
              <>
                <ItemImage src={i.image_url} alt={i.name} tint={i.colors[0]} className="aspect-[3/4] rounded-2xl" />
                <div className="mt-2 flex items-start justify-between gap-2 px-0.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{i.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
                      <span className={cn("size-1.5 rounded-full", statusDot[i.status])} />
                      {i.times_worn ? `Worn ${i.times_worn}×` : "Not worn yet"}
                    </p>
                  </div>
                  {i.favorite && <Heart className="mt-0.5 size-3.5 shrink-0 fill-accent text-accent" />}
                </div>
              </>
            );
            return selecting ? (
              <button
                key={i.id}
                onClick={() => toggleSelect(i.id)}
                aria-pressed={isSel}
                className={cn("relative rounded-2xl text-left transition", isSel && "ring-2 ring-accent ring-offset-4 ring-offset-bg")}
              >
                {card}
                <span
                  className={cn(
                    "absolute left-2 top-2 grid size-6 place-items-center rounded-full border text-xs",
                    isSel ? "border-accent bg-accent text-accent-fg" : "border-white/40 bg-bg/50",
                  )}
                >
                  {isSel && "✓"}
                </span>
              </button>
            ) : (
              <Link key={i.id} href={`/closet/${i.id}`} className="group rounded-2xl transition-transform hover:-translate-y-0.5">
                {card}
              </Link>
            );
          })}
        </div>
      )}

      {/* Bulk action bar */}
      {selecting && selected.size > 0 && (
        <div className="glass fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl p-3 md:bottom-6">
          <span className="px-2 text-sm">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => bulk(() => patchItems(ids, { status: "clean" }), "Marked clean")}>
              Clean
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => bulk(() => patchItems(ids, { status: "dirty" }), "Moved to laundry")}>
              <Droplets className="size-3.5" /> Laundry
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => bulk(() => patchItems(ids, { favorite: true }), "Added to favorites")}>
              <Heart className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                const t = prompt("Add tags (comma separated)");
                if (t) bulk(() => addTags(ids, t.split(",")), "Tags added");
              }}
            >
              <Tag className="size-3.5" />
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => bulk(() => patchItems(ids, { archived: true }), "Archived — find them in Profile → Archive")}>
              <Archive className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              disabled={pending}
              onClick={() => {
                if (confirm(`Permanently delete ${selected.size} item(s) and their photos? This can't be undone.`))
                  bulk(() => deleteItems(ids), "Deleted");
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} aria-label="Clear selection">
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function hueKey(i: ItemWithImage) {
  const c = i.colors[0];
  if (!c) return 999;
  const { h, s, l } = hexToHsl(c);
  return s < 12 ? 400 + (100 - l) : h;
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex items-center gap-1 rounded-full border px-3 py-1 text-xs capitalize transition-colors",
        on ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

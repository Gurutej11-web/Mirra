"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Columns2,
  ImageIcon,
  Loader2,
  Lock,
  LockOpen,
  RotateCcw,
  Save,
  Shuffle,
  Trash2,
  User,
  Wand2,
  X,
} from "lucide-react";
import { Avatar, BODY_SHAPES, DEFAULT_AVATAR, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from "@/components/tryon/avatar";
import { OutfitCanvas } from "@/components/tryon/outfit-canvas";
import { ItemImage } from "@/components/closet/item-image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { saveOutfit } from "@/app/(app)/outfits/actions";
import { saveAvatar, setTryonPhoto } from "@/app/(app)/profile/actions";
import { SLOTS, defaultLayer, type Layer } from "@/lib/layout";
import { generateOutfits, scoreOutfit } from "@/lib/outfit-engine";
import { compressImage } from "@/lib/image";
import { uploadToBucket } from "@/lib/upload";
import { OCCASIONS } from "@/lib/style";
import { CATEGORIES, CATEGORY_LABELS, type AvatarConfig, type Category, type ItemWithImage, type Lookbook } from "@/lib/types";
import { cn } from "@/lib/utils";

type Selection = Partial<Record<Category, string>>;

export type StudioInitial = {
  outfitId?: string;
  name?: string;
  occasion?: string | null;
  lookbook_id?: string | null;
  item_ids: string[];
  layout: Record<string, Layer>;
};

export function Studio({
  userId,
  items,
  avatar: initialAvatar,
  photoUrl: initialPhoto,
  lookbooks,
  initial,
  palette,
}: {
  userId: string;
  items: ItemWithImage[];
  avatar: AvatarConfig;
  photoUrl: string | null;
  lookbooks: Lookbook[];
  initial: StudioInitial | null;
  palette: { best: string[]; avoid: string[] };
}) {
  const router = useRouter();
  const toast = useToast();
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const byCat = useMemo(() => {
    const m: Partial<Record<Category, ItemWithImage[]>> = {};
    for (const i of items) (m[i.category] ??= []).push(i);
    return m;
  }, [items]);
  const cats = CATEGORIES.filter((c) => byCat[c]?.length);

  const [sel, setSel] = useState<Selection>(() => {
    const s: Selection = {};
    for (const id of initial?.item_ids ?? []) {
      const it = byId.get(id);
      if (it) s[it.category] = id;
    }
    return s;
  });
  const [layout, setLayout] = useState<Record<string, Layer>>(initial?.layout ?? {});
  const [activeCat, setActiveCat] = useState<Category>(cats[0] ?? "top");
  const [editing, setEditing] = useState<string | null>(null);
  const [locks, setLocks] = useState<Set<Category>>(new Set());
  const [mode, setMode] = useState<"avatar" | "photo">(initialPhoto ? "photo" : "avatar");
  const [photoUrl, setPhotoUrl] = useState(initialPhoto);
  const [avatar, setAvatar] = useState<AvatarConfig>({ ...DEFAULT_AVATAR, ...initialAvatar });
  const [panel, setPanel] = useState<"none" | "avatar" | "save">("none");
  const [compareA, setCompareA] = useState<{ sel: Selection; layout: Record<string, Layer> } | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [occasion, setOccasion] = useState(initial?.occasion ?? "");
  const [lookbookId, setLookbookId] = useState(initial?.lookbook_id ?? "");
  const [newLookbook, setNewLookbook] = useState("");
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(null);

  const chosen = useMemo(
    () => Object.values(sel).map((id) => byId.get(id!)).filter((x): x is ItemWithImage => !!x),
    [sel, byId],
  );
  const score = chosen.length >= 2 ? scoreOutfit(chosen, { bestColors: palette.best, avoidColors: palette.avoid }) : null;

  const layerFor = useCallback((it: ItemWithImage) => layout[it.id] ?? defaultLayer(it.category), [layout]);

  function choose(it: ItemWithImage) {
    setSel((s) => {
      const n = { ...s };
      if (n[it.category] === it.id) delete n[it.category];
      else {
        n[it.category] = it.id;
        // a dress replaces top + bottom and vice versa
        if (it.category === "dress") { delete n.top; delete n.bottom; }
        if (it.category === "top" || it.category === "bottom") delete n.dress;
      }
      return n;
    });
  }

  function cycle(cat: Category, dir: 1 | -1) {
    const list = byCat[cat] ?? [];
    if (!list.length) return;
    const idx = list.findIndex((i) => i.id === sel[cat]);
    const next = list[(idx + dir + list.length) % list.length];
    setSel((s) => ({ ...s, [cat]: next.id, ...(cat === "dress" ? { top: undefined, bottom: undefined } : {}) }));
  }

  function shuffle() {
    const lockedIds = [...locks].map((c) => sel[c]).filter((x): x is string => !!x);
    const [best] = generateOutfits(items, { lockedIds, bestColors: palette.best, avoidColors: palette.avoid, allowDirty: false }, 1, 300);
    if (!best) {
      toast("Add a few more clean tops and bottoms to shuffle outfits.", { tone: "info" });
      return;
    }
    const s: Selection = {};
    for (const it of best.items) s[it.category] = it.id;
    setSel(s);
  }

  const [completing, setCompleting] = useState(false);
  async function completeLook() {
    if (!chosen.length) return toast("Pick at least one piece, then let Mirra finish the look.", { tone: "info" });
    setCompleting(true);
    try {
      const res = await fetch("/api/tools/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: chosen.map((c) => c.id), occasion: occasion || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't complete the look.");
      const { add, remove, why } = json as { add: string[]; remove: string[]; why: string };
      if (!add.length && !remove.length) {
        toast("This look is already complete.", { tone: "info" });
        return;
      }
      setSel((s) => {
        const n: Selection = { ...s };
        for (const id of remove) {
          const it = byId.get(id);
          if (it && n[it.category] === id) delete n[it.category];
        }
        for (const id of add) {
          const it = byId.get(id);
          if (!it) continue;
          n[it.category] = id;
          if (it.category === "dress") { delete n.top; delete n.bottom; }
          if (it.category === "top" || it.category === "bottom") delete n.dress;
        }
        return n;
      });
      toast(why || "Look completed", { tone: "info", duration: 6000 });
    } catch (e) {
      toast((e as Error).message, { tone: "error" });
    } finally {
      setCompleting(false);
    }
  }

  function updateLayer(id: string, patch: Partial<Layer>) {
    const it = byId.get(id);
    if (!it) return;
    setLayout((l) => ({ ...l, [id]: { ...(l[id] ?? defaultLayer(it.category)), ...patch } }));
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const it = byId.get(id)!;
    const l = layerFor(it);
    drag.current = { id, startX: e.clientX, startY: e.clientY, ox: l.x, oy: l.y };
    setEditing(id);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    const dx = ((e.clientX - d.startX) / box.width) * 100;
    const dy = ((e.clientY - d.startY) / box.height) * 100;
    updateLayer(d.id, { x: Math.max(-20, Math.min(120, d.ox + dx)), y: Math.max(-20, Math.min(120, d.oy + dy)) });
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function uploadPhoto(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressImage(file, { max: 1400 });
      const path = await uploadToBucket("avatars", userId, `tryon-${Date.now()}.jpg`, blob);
      const res = await setTryonPhoto(path);
      if ("error" in res && res.error) throw new Error(res.error);
      setPhotoUrl(URL.createObjectURL(blob));
      setMode("photo");
      toast("Photo saved privately — drag pieces onto yourself");
    } catch (e) {
      toast((e as Error).message, { tone: "error" });
    } finally {
      setUploading(false);
    }
  }

  function save() {
    const ids = chosen.map((c) => c.id);
    if (!ids.length) return toast("Pick at least one piece first.", { tone: "error" });
    start(async () => {
      const res = await saveOutfit({
        id: initial?.outfitId,
        name: name.trim() || `${chosen[0].name} look`,
        item_ids: ids,
        layout: Object.fromEntries(chosen.map((c) => [c.id, layerFor(c)])),
        occasion: occasion || null,
        lookbook_id: lookbookId && lookbookId !== "__new" ? lookbookId : null,
        new_lookbook: lookbookId === "__new" ? newLookbook.trim() || undefined : undefined,
      });
      if ("error" in res && res.error) return toast(res.error, { tone: "error" });
      toast("Outfit saved", { action: { label: "View", onClick: () => router.push(`/outfits/${(res as { id: string }).id}`) } });
      setPanel("none");
      router.refresh();
    });
  }

  if (!items.length) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center">
        <User className="mx-auto size-10 text-accent" />
        <p className="mt-4 font-display text-3xl">Add some clothes first</p>
        <p className="mt-2 text-sm text-fg-muted">The studio dresses your avatar with pieces from your closet.</p>
        <Button className="mt-6" onClick={() => router.push("/closet/add")}>Add items</Button>
      </div>
    );
  }

  const editingItem = editing ? byId.get(editing) : null;
  const editingLayer = editingItem ? layerFor(editingItem) : null;
  const compareItems = compareA ? Object.values(compareA.sel).map((id) => byId.get(id!)).filter((x): x is ItemWithImage => !!x) : [];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      {/* Canvas */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex rounded-full bg-surface p-1 text-xs">
            <button onClick={() => setMode("avatar")} className={cn("rounded-full px-3 py-1.5", mode === "avatar" ? "bg-surface-2 text-fg" : "text-fg-subtle")}>
              Avatar
            </button>
            <button
              onClick={() => (photoUrl ? setMode("photo") : photoInput.current?.click())}
              className={cn("rounded-full px-3 py-1.5", mode === "photo" ? "bg-surface-2 text-fg" : "text-fg-subtle")}
            >
              My photo
            </button>
          </div>
          {score != null && (
            <span className="ml-auto rounded-full bg-surface px-3 py-1.5 text-xs" title="Instant score from color harmony, formality and your palette">
              Harmony <span className="font-medium text-accent">{score}</span>
            </span>
          )}
        </div>

        <div
          ref={canvasRef}
          className="relative mx-auto aspect-[300/640] max-h-[70vh] touch-none select-none overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_50%_30%,var(--surface-2),var(--bg-elevated))]"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={(e) => e.target === e.currentTarget && setEditing(null)}
        >
          {mode === "photo" && photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="You" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Avatar config={avatar} className="pointer-events-none absolute inset-0 h-full w-full" />
          )}
          {chosen
            .slice()
            .sort((a, b) => (layerFor(a).z ?? 0) - (layerFor(b).z ?? 0))
            .map((it) => {
              const l = layerFor(it);
              return (
                <div
                  key={it.id}
                  onPointerDown={(e) => onPointerDown(e, it.id)}
                  className={cn("absolute cursor-grab active:cursor-grabbing", editing === it.id && "outline-2 outline-dashed outline-accent")}
                  style={{
                    left: `${l.x}%`,
                    top: `${l.y}%`,
                    width: `${SLOTS[it.category].w * l.scale}%`,
                    transform: `translate(-50%, -50%) rotate(${l.rotate ?? 0}deg)`,
                    zIndex: l.z,
                  }}
                >
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_url} alt={it.name} draggable={false} className="pointer-events-none w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]" />
                  ) : (
                    <div className="aspect-square w-full rounded-xl" style={{ background: it.colors[0] ?? "#555" }} />
                  )}
                </div>
              );
            })}
          {!chosen.length && (
            <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs text-fg-subtle">Tap pieces below to dress up</p>
          )}
        </div>

        {editingItem && editingLayer && (
          <div className="mt-3 space-y-3 rounded-2xl bg-surface p-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="truncate text-fg">{editingItem.name}</span>
              <button aria-label="Done" onClick={() => setEditing(null)}><X className="size-4 text-fg-subtle" /></button>
            </div>
            <label className="flex items-center gap-3">
              <span className="w-12 text-fg-subtle">Size</span>
              <input type="range" min={0.4} max={2.2} step={0.02} value={editingLayer.scale} onChange={(e) => updateLayer(editingItem.id, { scale: +e.target.value })} className="flex-1 accent-[var(--accent)]" />
            </label>
            <label className="flex items-center gap-3">
              <span className="w-12 text-fg-subtle">Rotate</span>
              <input type="range" min={-45} max={45} step={1} value={editingLayer.rotate ?? 0} onChange={(e) => updateLayer(editingItem.id, { rotate: +e.target.value })} className="flex-1 accent-[var(--accent)]" />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => updateLayer(editingItem.id, { z: Math.min(20, (editingLayer.z ?? 0) + 1) })}>Bring forward</Button>
              <Button size="sm" variant="secondary" onClick={() => updateLayer(editingItem.id, { z: Math.max(0, (editingLayer.z ?? 0) - 1) })}>Send back</Button>
              <Button size="sm" variant="ghost" onClick={() => setLayout((l) => { const n = { ...l }; delete n[editingItem.id]; return n; })}>
                <RotateCcw className="size-3.5" /> Reset
              </Button>
              <Button size="sm" variant="ghost" className="text-danger" onClick={() => { choose(editingItem); setEditing(null); }}>
                <Trash2 className="size-3.5" /> Remove
              </Button>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={shuffle} size="sm"><Shuffle className="size-4" /> Shuffle</Button>
          <Button onClick={completeLook} size="sm" variant="secondary" disabled={completing}>
            {completing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} Complete the look
          </Button>
          <Button onClick={() => setPanel(panel === "save" ? "none" : "save")} size="sm" variant="secondary" disabled={!chosen.length}><Save className="size-4" /> Save</Button>
          <Button onClick={() => (compareA ? setCompareA(null) : setCompareA({ sel, layout }))} size="sm" variant="secondary" disabled={!chosen.length && !compareA}>
            <Columns2 className="size-4" /> {compareA ? "End compare" : "Compare"}
          </Button>
          <Button onClick={() => setPanel(panel === "avatar" ? "none" : "avatar")} size="sm" variant="ghost"><User className="size-4" /> Avatar</Button>
          <Button onClick={() => photoInput.current?.click()} size="sm" variant="ghost" disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />} {photoUrl ? "New photo" : "Use my photo"}
          </Button>
          {chosen.length > 0 && <Button onClick={() => { setSel({}); setLayout({}); }} size="sm" variant="ghost">Clear</Button>}
        </div>
        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { uploadPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      {/* Right column */}
      <div className="min-w-0 space-y-5">
        {panel === "save" && (
          <div className="space-y-3 rounded-3xl border border-border bg-surface/60 p-5">
            <p className="font-medium">{initial?.outfitId ? "Update outfit" : "Save outfit"}</p>
            <input className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-accent" placeholder="Name, e.g. Friday dinner" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                <option value="">Occasion (optional)</option>
                {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <select className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" value={lookbookId} onChange={(e) => setLookbookId(e.target.value)}>
                <option value="">No lookbook</option>
                {lookbooks.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                <option value="__new">+ New lookbook…</option>
              </select>
            </div>
            {lookbookId === "__new" && (
              <input className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-accent" placeholder="Lookbook name" value={newLookbook} maxLength={40} onChange={(e) => setNewLookbook(e.target.value)} />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPanel("none")}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Save</Button>
            </div>
          </div>
        )}

        {panel === "avatar" && (
          <div className="space-y-4 rounded-3xl border border-border bg-surface/60 p-5">
            <div className="flex items-center justify-between">
              <p className="font-medium">Your avatar</p>
              <Button size="sm" onClick={() => start(async () => { const r = await saveAvatar(avatar); toast("error" in r && r.error ? r.error : "Avatar saved", { tone: "error" in r && r.error ? "error" : "success" }); })} disabled={pending}>Save avatar</Button>
            </div>
            <SwatchRow label="Skin" colors={SKIN_TONES} value={avatar.skin} onChange={(skin) => setAvatar({ ...avatar, skin })} />
            <SwatchRow label="Hair" colors={HAIR_COLORS} value={avatar.hair} onChange={(hair) => setAvatar({ ...avatar, hair })} />
            <ChipRow label="Hair style" options={HAIR_STYLES} value={avatar.hairStyle} onChange={(hairStyle) => setAvatar({ ...avatar, hairStyle })} />
            <ChipRow label="Body" options={BODY_SHAPES} value={avatar.body} onChange={(body) => setAvatar({ ...avatar, body })} />
          </div>
        )}

        {compareA && (
          <div className="rounded-3xl border border-border bg-surface/60 p-5">
            <p className="flex items-center gap-2 font-medium"><ArrowLeftRight className="size-4 text-accent" /> Compare</p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {[{ label: "A (pinned)", its: compareItems, lay: compareA.layout }, { label: "B (current)", its: chosen, lay: layout }].map((o) => {
                const s = o.its.length >= 2 ? scoreOutfit(o.its, { bestColors: palette.best, avoidColors: palette.avoid }) : null;
                return (
                  <div key={o.label} className="text-center">
                    <OutfitCanvas items={o.its} layout={o.lay} avatar={avatar} photoUrl={mode === "photo" ? photoUrl : null} className="mx-auto w-full max-w-[180px] rounded-2xl bg-surface-2" />
                    <p className="mt-2 text-xs text-fg-subtle">{o.label}</p>
                    <p className="font-display text-2xl">{s ?? "—"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category rails */}
        <div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm",
                  activeCat === c ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted hover:text-fg",
                )}
              >
                {CATEGORY_LABELS[c]}
                {sel[c] && <span className="size-1.5 rounded-full bg-accent" />}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button aria-label="Previous" onClick={() => cycle(activeCat, -1)} className="grid size-9 place-items-center rounded-full border border-border hover:bg-surface"><ChevronLeft className="size-4" /></button>
            <button aria-label="Next" onClick={() => cycle(activeCat, 1)} className="grid size-9 place-items-center rounded-full border border-border hover:bg-surface"><ChevronRight className="size-4" /></button>
            <button
              onClick={() => setLocks((l) => { const n = new Set(l); if (n.has(activeCat)) n.delete(activeCat); else n.add(activeCat); return n; })}
              className={cn("ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs", locks.has(activeCat) ? "border-accent text-accent" : "border-border text-fg-muted")}
              title="Locked pieces stay when you shuffle"
            >
              {locks.has(activeCat) ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
              {locks.has(activeCat) ? "Locked" : "Lock for shuffle"}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
            {(byCat[activeCat] ?? []).map((it) => (
              <button
                key={it.id}
                onClick={() => choose(it)}
                aria-pressed={sel[it.category] === it.id}
                className={cn("relative rounded-2xl text-left transition", sel[it.category] === it.id && "ring-2 ring-accent ring-offset-2 ring-offset-bg")}
              >
                <ItemImage src={it.image_url} alt={it.name} tint={it.colors[0]} className="aspect-square rounded-2xl" />
                {it.status !== "clean" && <span className="absolute right-1.5 top-1.5 rounded-full bg-warning/90 px-1.5 text-[10px] text-black">laundry</span>}
                <p className="mt-1 truncate px-0.5 text-[11px] text-fg-muted">{it.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SwatchRow({ label, colors, value, onChange }: { label: string; colors: string[]; value?: string; onChange: (c: string) => void }) {
  return (
    <div>
      <p className="text-xs text-fg-subtle">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {colors.map((c) => (
          <button key={c} aria-label={c} onClick={() => onChange(c)} className={cn("size-8 rounded-full border border-white/15", value === c && "ring-2 ring-accent ring-offset-2 ring-offset-bg")} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

function ChipRow<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value?: T; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="text-xs text-fg-subtle">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={cn("rounded-full border px-3 py-1 text-xs capitalize", value === o ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted")}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

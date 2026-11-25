"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, Check, ImagePlus, Link2, Loader2, RotateCw, ScanLine, Trash2, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ItemForm, emptyDraft, inputClass } from "@/components/closet/item-form";
import { compressImage, cropNormalized, dataUrlToBlob, rotate90 } from "@/lib/image";
import { postForm, postJSON, uploadToBucket } from "@/lib/upload";
import { createItem } from "@/app/(app)/closet/actions";
import { colorDistance } from "@/lib/colors";
import type { ItemInput } from "@/lib/item-schema";
import type { AIItem } from "@/lib/item-schema";
import { cn } from "@/lib/utils";

type Existing = { id: string; name: string; category: string; colors: string[]; image_url: string | null };

type Draft = {
  key: string;
  original: Blob;
  originalUrl: string;
  cutout: Blob | null;
  cutoutUrl: string | null;
  useCutout: boolean;
  fields: ItemInput;
  status: "analyzing" | "ready" | "saving" | "saved" | "error";
  note?: string;
};

type AnalyzeResult = { tags: AIItem | null; cutout: string | null; cutoutReason?: string };

const TABS = [
  { id: "photo", label: "Photo of item", icon: Camera },
  { id: "outfit", label: "Photo of me", icon: ScanLine },
  { id: "link", label: "Product link", icon: Link2 },
] as const;

const CUTOUT_NOTES: Record<string, string> = {
  out_of_credits: "Background removal credits are used up this month — using the original photo.",
  not_configured: "Background removal isn't set up — using the original photo.",
  no_subject: "Couldn't find the item to cut out — using the original photo.",
  error: "Background removal failed — using the original photo.",
};

function toFields(t: AIItem | null, extra: Partial<ItemInput> = {}): ItemInput {
  if (!t) return emptyDraft(extra);
  return emptyDraft({
    name: t.name,
    category: t.category,
    subcategory: t.subcategory,
    colors: t.colors,
    pattern: t.pattern,
    material: t.material,
    formality: t.formality,
    seasons: t.seasons,
    tags: t.tags,
    brand: t.brand,
    ...extra,
  });
}

/** Run async tasks with limited concurrency. */
async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  }));
}

export function AddItem({ userId, existing, initialUrl }: { userId: string; existing: Existing[]; initialUrl?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>(initialUrl ? "link" : "photo");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(initialUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const outfitRef = useRef<HTMLInputElement>(null);

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  function newDraft(original: Blob, fields: ItemInput = emptyDraft()): Draft {
    return {
      key: crypto.randomUUID(),
      original,
      originalUrl: URL.createObjectURL(original),
      cutout: null,
      cutoutUrl: null,
      useCutout: true,
      fields,
      status: "analyzing",
    };
  }

  async function analyze(d: Draft, opts: { tags: boolean; extra?: Partial<ItemInput> }) {
    try {
      const form = new FormData();
      form.append("image", d.original, "item.jpg");
      form.append("tags", opts.tags ? "1" : "0");
      const res = await postForm<AnalyzeResult>("/api/items/analyze", form);
      const cutout = res.cutout ? dataUrlToBlob(res.cutout) : null;
      setDrafts((ds) =>
        ds.map((x) =>
          x.key === d.key
            ? {
                ...x,
                status: "ready",
                cutout,
                cutoutUrl: cutout ? URL.createObjectURL(cutout) : null,
                fields: opts.tags ? toFields(res.tags, { ...opts.extra }) : { ...x.fields, ...opts.extra },
                note: res.cutoutReason && res.cutoutReason !== "skipped" ? CUTOUT_NOTES[res.cutoutReason] : undefined,
              }
            : x,
        ),
      );
    } catch (e) {
      update(d.key, { status: "ready", note: `${(e as Error).message} Fill in the details yourself.` });
    }
  }

  async function onPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files).slice(0, 12);
    const created: Draft[] = [];
    for (const f of list) {
      try {
        created.push(newDraft(await compressImage(f)));
      } catch (e) {
        setError((e as Error).message);
      }
    }
    setDrafts((ds) => [...created, ...ds]);
    await pool(created, 2, (d) => analyze(d, { tags: true }));
  }

  async function onOutfit(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const photo = await compressImage(file, { max: 1600 });
      const form = new FormData();
      form.append("image", photo, "outfit.jpg");
      const res = await postForm<{ person_found: boolean; issue: string | null; items: (AIItem & { box: { x1: number; y1: number; x2: number; y2: number } })[] }>(
        "/api/items/detect",
        form,
      );
      if (!res.items.length) {
        setError(res.issue ?? "Couldn't spot any clothing — try a brighter, full-body photo.");
        return;
      }
      const created: Draft[] = [];
      for (const it of res.items) {
        const crop = await cropNormalized(photo, it.box);
        created.push(newDraft(crop, toFields(it)));
      }
      setDrafts((ds) => [...created, ...ds]);
      toast(`Found ${created.length} item${created.length === 1 ? "" : "s"} — removing backgrounds…`, { tone: "info" });
      await pool(created, 2, (d) => analyze(d, { tags: false }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (outfitRef.current) outfitRef.current.value = "";
    }
  }

  async function onLink(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await postJSON<{ name: string | null; price: number | null; brand: string | null; source_url: string; image: string | null }>(
        "/api/items/import",
        { url: url.trim() },
      );
      const extra: Partial<ItemInput> = {
        price: res.price,
        source_url: res.source_url.slice(0, 1000),
        ...(res.brand ? { brand: res.brand.slice(0, 40) } : {}),
      };
      if (!res.image) {
        setError("Found the product but not its photo — upload a screenshot in the Photo tab instead.");
        return;
      }
      const d = newDraft(await compressImage(dataUrlToBlob(res.image)), emptyDraft({ name: res.name ?? "", ...extra }));
      setDrafts((ds) => [d, ...ds]);
      setUrl("");
      await analyze(d, { tags: true, extra: { ...extra, ...(res.name ? { name: res.name.slice(0, 80) } : {}) } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function rotateDraft(d: Draft) {
    const rotated = await rotate90(d.original);
    update(d.key, { original: rotated, originalUrl: URL.createObjectURL(rotated) });
    if (d.cutout) {
      const rc = await rotate90(d.cutout);
      update(d.key, { cutout: rc, cutoutUrl: URL.createObjectURL(rc) });
    }
  }

  async function saveAll() {
    const ready = drafts.filter((d) => d.status === "ready");
    const invalid = ready.find((d) => !d.fields.name.trim());
    if (invalid) {
      setError("Every item needs a name before saving.");
      return;
    }
    setError(null);
    let saved = 0;
    await pool(ready, 3, async (d) => {
      update(d.key, { status: "saving" });
      try {
        const id = crypto.randomUUID();
        const image_path = await uploadToBucket("closet", userId, `${id}-orig.jpg`, d.original);
        const cutout_path =
          d.useCutout && d.cutout ? await uploadToBucket("closet", userId, `${id}-cut.png`, d.cutout) : null;
        const res = await createItem({ ...d.fields, id, image_path, cutout_path });
        if ("error" in res && res.error) throw new Error(res.error);
        update(d.key, { status: "saved" });
        saved++;
      } catch (e) {
        update(d.key, { status: "error", note: (e as Error).message });
      }
    });
    if (saved) {
      toast(`Added ${saved} item${saved === 1 ? "" : "s"} to your closet`);
      setDrafts((ds) => ds.filter((d) => d.status !== "saved"));
      router.refresh();
      if (!drafts.some((d) => d.status === "error")) router.push("/closet");
    }
  }

  function similarTo(d: Draft) {
    const c = d.fields.colors[0];
    if (!c) return null;
    return existing.find(
      (e) => e.category === d.fields.category && e.colors[0] && colorDistance(e.colors[0], c) < 14,
    );
  }

  const readyCount = drafts.filter((d) => d.status === "ready").length;
  const analyzing = drafts.some((d) => d.status === "analyzing");

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-surface p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setError(null);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition-colors",
              tab === t.id ? "bg-surface-2 text-fg" : "text-fg-subtle hover:text-fg",
            )}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-3xl border border-dashed border-border p-6 sm:p-10">
        {tab === "photo" && (
          <div
            className="text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onPhotos(e.dataTransfer.files);
            }}
          >
            <ImagePlus className="mx-auto size-10 text-accent" />
            <p className="mt-4 font-display text-3xl">Snap or upload pieces</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
              Lay it flat or hang it on a plain background. Add up to 12 at once — Mirra cuts them out and tags them.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={() => cameraRef.current?.click()}>
                <Camera className="size-4" /> Take photo
              </Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" /> Upload photos
              </Button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onPhotos(e.target.files); e.target.value = ""; }} />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { onPhotos(e.target.files); e.target.value = ""; }} />
          </div>
        )}

        {tab === "outfit" && (
          <div className="text-center">
            <ScanLine className="mx-auto size-10 text-accent" />
            <p className="mt-4 font-display text-3xl">One selfie, whole outfit</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
              Upload a full-body mirror selfie. Mirra finds each piece you&apos;re wearing and adds them separately.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => outfitRef.current?.click()} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                {busy ? "Finding your pieces…" : "Choose outfit photo"}
              </Button>
            </div>
            <input ref={outfitRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onOutfit(e.target.files?.[0])} />
          </div>
        )}

        {tab === "link" && (
          <form onSubmit={onLink} className="mx-auto max-w-lg text-center">
            <Link2 className="mx-auto size-10 text-accent" />
            <p className="mt-4 font-display text-3xl">Paste a product link</p>
            <p className="mt-2 text-sm text-fg-muted">We&apos;ll grab the photo, name, brand and price from the store page.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                className={inputClass}
                type="url"
                inputMode="url"
                placeholder="https://store.com/product/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button type="submit" disabled={busy || !url.trim()} className="shrink-0">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Import
              </Button>
            </div>
          </form>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {drafts.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              Review {drafts.length} item{drafts.length === 1 ? "" : "s"}
            </h2>
            <Button onClick={saveAll} disabled={!readyCount || analyzing}>
              {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {analyzing ? "Analyzing…" : `Save ${readyCount} to closet`}
            </Button>
          </div>

          {drafts.map((d) => {
            const dup = d.status === "ready" ? similarTo(d) : null;
            const shown = d.useCutout && d.cutoutUrl ? d.cutoutUrl : d.originalUrl;
            return (
              <div key={d.key} className={cn("grid gap-5 rounded-3xl border border-border bg-surface/60 p-4 sm:grid-cols-[200px_1fr] sm:p-5", d.status === "saved" && "opacity-50")}>
                <div>
                  <div className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-2xl bg-[repeating-conic-gradient(var(--surface-2)_0%_25%,var(--surface)_0%_50%)] bg-[length:20px_20px]">
                    { }
                    <img src={shown} alt="" className="max-h-full max-w-full object-contain" />
                    {d.status === "analyzing" && (
                      <div className="absolute inset-0 grid place-items-center bg-bg/60 backdrop-blur-sm">
                        <div className="text-center text-xs text-fg-muted">
                          <Loader2 className="mx-auto mb-2 size-6 animate-spin text-accent" /> Analyzing…
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {d.cutoutUrl ? (
                      <button className="text-xs text-fg-muted hover:text-fg" onClick={() => update(d.key, { useCutout: !d.useCutout })}>
                        {d.useCutout ? "Use original" : "Use cutout"}
                      </button>
                    ) : (
                      <span />
                    )}
                    <div className="flex gap-1">
                      <button aria-label="Rotate" className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg" onClick={() => rotateDraft(d)}>
                        <RotateCw className="size-4" />
                      </button>
                      <button
                        aria-label="Remove"
                        className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-danger"
                        onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  {d.note && <p className="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">{d.note}</p>}
                  {dup && (
                    <p className="mb-3 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-fg-muted">
                      <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                      Looks a lot like your <span className="text-fg">{dup.name}</span> — already own it?
                    </p>
                  )}
                  {d.status === "saved" ? (
                    <p className="flex items-center gap-2 text-sm text-success">
                      <Check className="size-4" /> Saved
                    </p>
                  ) : (
                    <ItemForm compact value={d.fields} onChange={(fields) => update(d.key, { fields })} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

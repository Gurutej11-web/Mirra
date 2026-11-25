"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Check, ExternalLink, HelpCircle, Link2, Loader2, Puzzle, ShoppingBag, Trash2, Upload, X } from "lucide-react";
import { ItemImage } from "@/components/closet/item-image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { addToWishlist, removeFromWishlist } from "@/app/(app)/shop/actions";
import { compressImage } from "@/lib/image";
import { postForm, postJSON, uploadToBucket } from "@/lib/upload";
import { colorName } from "@/lib/colors";
import type { WishlistItem } from "@/lib/types";
import type { AIItem } from "@/lib/item-schema";
import { cn } from "@/lib/utils";

type Mini = { id: string; name: string; image_url: string | null; color: string | null };
type Analysis = {
  name: string;
  price: number | null;
  brand: string | null;
  url: string | null;
  image_url: string | null;
  image_data: string | null;
  item: AIItem;
  verdict: "buy" | "maybe" | "skip";
  headline: string;
  reasons: string[];
  similar_ids: string[];
  pairs_with: string[];
  outfits_unlocked: number;
  match_score: number;
};
type Gap = { name: string; category: string; color: string; why: string; unlocks: number; pairs_with: string[]; priority: "high" | "medium" | "low" };

const VERDICT = {
  buy: { label: "Worth it", cls: "bg-success/15 text-success" },
  maybe: { label: "Think it over", cls: "bg-warning/15 text-warning" },
  skip: { label: "Skip it", cls: "bg-danger/15 text-danger" },
} as const;

export function ShopTools({ userId, items, wishlist, closetSize }: { userId: string; items: Mini[]; wishlist: WishlistItem[]; closetSize: number }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"check" | "gaps" | "wishlist">("check");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [upload, setUpload] = useState<Blob | null>(null);
  const [gaps, setGaps] = useState<{ summary: string; gaps: Gap[] } | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const byId = new Map(items.map((i) => [i.id, i]));

  async function analyze(form: FormData) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await postForm<Analysis>("/api/shop/analyze", form));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function fromUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setUpload(null);
    const f = new FormData();
    f.append("url", url.trim());
    analyze(f);
  }

  async function fromFile(file?: File) {
    if (!file) return;
    const blob = await compressImage(file, { max: 1000 });
    setUpload(blob);
    const f = new FormData();
    f.append("image", blob, "product.jpg");
    analyze(f);
  }

  function save() {
    if (!result) return;
    start(async () => {
      let image_url = result.image_url;
      if (!image_url && upload) {
        const path = await uploadToBucket("closet", userId, `wish-${crypto.randomUUID()}.jpg`, upload);
        image_url = `closet:${path}`;
      }
      const r = await addToWishlist({
        name: result.name,
        url: result.url,
        image_url,
        price: result.price,
        match_score: result.match_score,
        outfits_unlocked: result.outfits_unlocked,
        verdict: result.verdict,
        analysis: { headline: result.headline, reasons: result.reasons, similar_ids: result.similar_ids, pairs_with: result.pairs_with },
      });
      if ("error" in r && r.error) toast(r.error, { tone: "error" });
      else {
        toast("Saved to wishlist");
        router.refresh();
      }
    });
  }

  async function findGaps() {
    setBusy(true);
    setError(null);
    try {
      setGaps(await postJSON("/api/shop/gaps", {}));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const previewSrc = result?.image_url ?? result?.image_data ?? (upload ? URL.createObjectURL(upload) : null);

  return (
    <div className="mt-8">
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-surface p-1" role="tablist">
        {[
          { id: "check", label: "Do I need this?", icon: HelpCircle },
          { id: "gaps", label: "Gap finder", icon: Puzzle },
          { id: "wishlist", label: `Wishlist ${wishlist.length || ""}`, icon: Bookmark },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => { setTab(t.id as typeof tab); setError(null); }}
            className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm", tab === t.id ? "bg-surface-2 text-fg" : "text-fg-subtle hover:text-fg")}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {tab === "check" && (
        <div className="mt-6">
          <form onSubmit={fromUrl} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a product link…"
              className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || !url.trim()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Check link
              </Button>
              <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Upload className="size-4" /> Screenshot
              </Button>
            </div>
          </form>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { fromFile(e.target.files?.[0]); e.target.value = ""; }} />
          {closetSize < 5 && <p className="mt-3 text-xs text-fg-subtle">Tip: verdicts get much smarter once you&apos;ve added a few items to your closet.</p>}

          {busy && !result && (
            <div className="mt-8 flex items-center gap-3 text-sm text-fg-muted">
              <Loader2 className="size-5 animate-spin text-accent" /> Comparing it with everything you own…
            </div>
          )}

          {result && (
            <div className="mt-8 grid gap-6 rounded-3xl border border-border p-5 md:grid-cols-[220px_1fr]">
              <div className="overflow-hidden rounded-2xl bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {previewSrc && <img src={previewSrc} alt={result.name} className="aspect-[3/4] w-full object-contain" />}
              </div>
              <div className="min-w-0">
                <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-medium", VERDICT[result.verdict].cls)}>{VERDICT[result.verdict].label}</span>
                <h2 className="mt-3 font-display text-3xl">{result.name}</h2>
                <p className="text-sm text-fg-muted">
                  {[result.brand, result.price != null && `$${result.price}`, result.item.colors[0] && colorName(result.item.colors[0])].filter(Boolean).join(" · ")}
                </p>
                {result.headline && <p className="mt-4 text-lg">{result.headline}</p>}

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <Stat value={`${result.match_score}`} label="Closet match" />
                  <Stat value={`${result.outfits_unlocked}`} label="New outfits" />
                  <Stat value={`${result.similar_ids.length}`} label="Similar owned" />
                </div>

                <ul className="mt-5 space-y-2 text-sm text-fg-muted">
                  {result.reasons.map((r) => <li key={r} className="flex gap-2"><span className="text-accent">✦</span> {r}</li>)}
                </ul>

                {result.similar_ids.length > 0 && <Strip title="You already own" ids={result.similar_ids} byId={byId} />}
                {result.pairs_with.length > 0 && <Strip title="Pairs with" ids={result.pairs_with} byId={byId} />}

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button onClick={save} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Bookmark className="size-4" />} Save to wishlist</Button>
                  {result.url && <a href={result.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm hover:bg-surface"><ExternalLink className="size-4" /> Store</a>}
                  <Button variant="ghost" onClick={() => setResult(null)}><X className="size-4" /> Clear</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "gaps" && (
        <div className="mt-6">
          {!gaps && (
            <div className="rounded-3xl border border-dashed border-border p-8 text-center">
              <Puzzle className="mx-auto size-10 text-accent" />
              <p className="mt-4 font-display text-3xl">What&apos;s your closet missing?</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">Mirra looks at everything you own and finds the few pieces that would unlock the most new outfits.</p>
              <Button className="mt-6" onClick={findGaps} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Puzzle className="size-4" />} Find my gaps</Button>
            </div>
          )}
          {gaps && (
            <div>
              {gaps.summary && <p className="text-fg-muted">{gaps.summary}</p>}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {gaps.gaps.map((g) => (
                  <div key={g.name} className="rounded-3xl border border-border p-5">
                    <div className="flex items-start gap-4">
                      <span className="size-12 shrink-0 rounded-2xl border border-white/10" style={{ background: g.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{g.name}</p>
                          {g.priority === "high" && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">top pick</span>}
                        </div>
                        <p className="mt-1 text-sm text-fg-muted">{g.why}</p>
                        <p className="mt-2 text-xs text-fg-subtle">Unlocks ~{g.unlocks} new outfits</p>
                      </div>
                    </div>
                    {g.pairs_with.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {g.pairs_with.map((id) => {
                          const it = byId.get(id);
                          return it ? <ItemImage key={id} src={it.image_url} alt={it.name} tint={it.color ?? undefined} className="aspect-[3/4] w-12 rounded-lg" /> : null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="mt-4" onClick={findGaps} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Run again</Button>
            </div>
          )}
        </div>
      )}

      {tab === "wishlist" && (
        <div className="mt-6">
          {wishlist.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">
              <ShoppingBag className="mx-auto size-10 text-accent" />
              <p className="mt-4">Things you check with “Do I need this?” can be saved here.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wishlist.map((w) => (
                <div key={w.id} className="flex gap-4 rounded-3xl border border-border p-4">
                  <div className="w-24 shrink-0 overflow-hidden rounded-2xl bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {w.image_url && <img src={w.image_url} alt={w.name ?? ""} className="aspect-[3/4] w-full object-contain" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {w.verdict && <span className={cn("rounded-full px-2 py-0.5 text-[10px]", VERDICT[w.verdict as keyof typeof VERDICT]?.cls)}>{VERDICT[w.verdict as keyof typeof VERDICT]?.label}</span>}
                    <p className="mt-1 line-clamp-2 text-sm font-medium">{w.name}</p>
                    <p className="text-xs text-fg-subtle">
                      {w.price != null && `$${w.price} · `}match {w.match_score} · {w.outfits_unlocked} outfits
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {w.url && (
                        <Link href={`/closet/add?url=${encodeURIComponent(w.url)}`} className="inline-flex h-8 items-center gap-1 rounded-full bg-surface-2 px-3 text-xs hover:bg-border">
                          <Check className="size-3" /> Bought it
                        </Link>
                      )}
                      {w.url && <a href={w.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-8 items-center rounded-full px-2 text-xs text-fg-muted hover:text-fg"><ExternalLink className="size-3.5" /></a>}
                      <button
                        className="inline-flex h-8 items-center rounded-full px-2 text-xs text-fg-muted hover:text-danger"
                        aria-label="Remove"
                        onClick={() => start(async () => { const r = await removeFromWishlist(w.id); if ("error" in r && r.error) toast(r.error, { tone: "error" }); else router.refresh(); })}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <p className="font-display text-3xl">{value}</p>
      <p className="text-[11px] text-fg-subtle">{label}</p>
    </div>
  );
}

function Strip({ title, ids, byId }: { title: string; ids: string[]; byId: Map<string, Mini> }) {
  return (
    <div className="mt-5">
      <p className="text-xs text-fg-subtle">{title}</p>
      <div className="mt-2 flex gap-2 overflow-x-auto">
        {ids.map((id) => {
          const it = byId.get(id);
          return it ? (
            <Link key={id} href={`/closet/${id}`} className="w-14 shrink-0" title={it.name}>
              <ItemImage src={it.image_url} alt={it.name} tint={it.color ?? undefined} className="aspect-[3/4] rounded-lg" />
            </Link>
          ) : null;
        })}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Loader2, Sparkles, Ticket } from "lucide-react";
import { ItemImage } from "@/components/closet/item-image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { postJSON } from "@/lib/upload";
import { saveOutfit } from "@/app/(app)/outfits/actions";
import type { ItemWithImage } from "@/lib/types";

type Result = { title: string; meaning: string; do: string[]; dont: string[]; formality: number; outfit: { item_ids: string[]; why: string }; missing: string[] };

const EXAMPLES = ["Cocktail attire", "Business casual", "Black tie optional", "Smart casual birthday dinner", "Garden wedding, semi-formal", "Creative office interview"];

export function DressCode({ items }: { items: ItemWithImage[] }) {
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [saving, start] = useTransition();
  const byId = new Map(items.map((i) => [i.id, i]));

  async function decode(text?: string) {
    const q = (text ?? code).trim();
    if (!q) return;
    setCode(q);
    setBusy(true);
    setError(null);
    try {
      setRes(await postJSON<Result>("/api/tools/dresscode", { code: q }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <form onSubmit={(e) => { e.preventDefault(); decode(); }} className="flex flex-col gap-3 sm:flex-row">
        <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={200} placeholder="Paste the dress code or describe the event…" className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-accent" />
        <Button type="submit" disabled={busy || !code.trim()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Ticket className="size-4" />} Decode</Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button key={e} onClick={() => decode(e)} disabled={busy} className="rounded-full border border-border px-3 py-1 text-xs text-fg-muted hover:text-fg">{e}</button>
        ))}
      </div>
      {error && <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {res && (
        <div className="mt-8 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle">Formality {res.formality}/5</p>
            <h2 className="mt-1 font-display text-4xl">{res.title}</h2>
            <p className="mt-2 text-fg-muted">{res.meaning}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-success/10 p-5">
              <p className="font-medium text-success">Do</p>
              <ul className="mt-2 space-y-1 text-sm">{res.do.map((d) => <li key={d}>· {d}</li>)}</ul>
            </div>
            <div className="rounded-3xl bg-danger/10 p-5">
              <p className="font-medium text-danger">Don&apos;t</p>
              <ul className="mt-2 space-y-1 text-sm">{res.dont.map((d) => <li key={d}>· {d}</li>)}</ul>
            </div>
          </div>
          {res.outfit.item_ids.length > 0 && (
            <div className="rounded-3xl border border-border p-5">
              <p className="flex items-center gap-2 font-medium"><Sparkles className="size-4 text-accent" /> From your closet</p>
              <p className="mt-1 text-sm text-fg-muted">{res.outfit.why}</p>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {res.outfit.item_ids.map((id) => {
                  const it = byId.get(id);
                  return it ? (
                    <Link key={id} href={`/closet/${id}`} className="w-20 shrink-0" title={it.name}>
                      <ItemImage src={it.image_url} alt={it.name} tint={it.colors[0]} className="aspect-[3/4] rounded-xl" />
                      <p className="mt-1 truncate text-[11px] text-fg-subtle">{it.name}</p>
                    </Link>
                  ) : null;
                })}
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/try-on?items=${res.outfit.item_ids.join(",")}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-accent-fg"><Sparkles className="size-4" /> Try it on</Link>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10"
                  disabled={saving}
                  onClick={() => start(async () => {
                    const r = await saveOutfit({ name: res.title.slice(0, 60), item_ids: res.outfit.item_ids, layout: {}, occasion: null, lookbook_id: null });
                    if ("error" in r && r.error) toast(r.error, { tone: "error" });
                    else toast("Saved to Outfits", { action: { label: "View", onClick: () => router.push(`/outfits/${(r as { id: string }).id}`) } });
                  })}
                >
                  <Bookmark className="size-4" /> Save
                </Button>
              </div>
            </div>
          )}
          {res.missing.length > 0 && (
            <div className="rounded-3xl bg-warning/10 p-5 text-sm">
              <p className="font-medium text-warning">Your closet is missing</p>
              <ul className="mt-2 space-y-1">{res.missing.map((m) => <li key={m}>· {m}</li>)}</ul>
              <Link href="/shop" className="mt-3 inline-block text-accent hover:underline">Check something before you buy →</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

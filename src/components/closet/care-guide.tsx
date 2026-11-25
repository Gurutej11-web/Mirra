"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Droplet, Loader2, Shirt, Sparkles, Sun, Wind } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { postJSON } from "@/lib/upload";
import { saveNotes } from "@/app/(app)/closet/actions";

type Guide = { wash: string; dry: string; iron: string; store: string; stains: string[]; lifespan_tip: string };

export function CareGuide({ itemId, notes }: { itemId: string; notes: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [saving, start] = useTransition();

  async function load() {
    setBusy(true);
    try {
      setGuide(await postJSON<Guide>("/api/tools/care", { itemId }));
    } catch (e) {
      toast((e as Error).message, { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!guide) return;
    const text = `Wash: ${guide.wash}\nDry: ${guide.dry}\nIron: ${guide.iron}\nStore: ${guide.store}`;
    const merged = notes ? `${notes}\n\n${text}` : text;
    start(async () => {
      const r = await saveNotes(itemId, merged.slice(0, 500));
      if ("error" in r && r.error) toast(r.error, { tone: "error" });
      else {
        toast("Saved to notes");
        router.refresh();
      }
    });
  }

  if (!guide)
    return (
      <button onClick={load} disabled={busy} className="mt-8 flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-fg-muted hover:text-fg">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-accent" />} {busy ? "Writing care guide…" : "Get an AI care guide"}
      </button>
    );

  const rows = [
    { icon: Droplet, label: "Wash", text: guide.wash },
    { icon: Wind, label: "Dry", text: guide.dry },
    { icon: Shirt, label: "Iron", text: guide.iron },
    { icon: Sun, label: "Store", text: guide.store },
  ];
  return (
    <div className="mt-8 rounded-3xl border border-border p-5">
      <div className="flex items-center justify-between">
        <p className="font-medium">Care guide</p>
        <button onClick={save} disabled={saving} className="text-xs text-accent hover:underline">{saving ? "Saving…" : "Save to notes"}</button>
      </div>
      <dl className="mt-3 space-y-3 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-3">
            <r.icon className="mt-0.5 size-4 shrink-0 text-accent" />
            <div><dt className="text-xs text-fg-subtle">{r.label}</dt><dd>{r.text}</dd></div>
          </div>
        ))}
      </dl>
      {guide.stains.length > 0 && (
        <div className="mt-4 text-sm">
          <p className="text-xs text-fg-subtle">Stain fixes</p>
          <ul className="mt-1 space-y-1 text-fg-muted">{guide.stains.map((s) => <li key={s}>· {s}</li>)}</ul>
        </div>
      )}
      {guide.lifespan_tip && <p className="mt-4 text-sm">💡 {guide.lifespan_tip}</p>}
      <p className="mt-3 text-[11px] text-fg-subtle">Always check the care label first.</p>
    </div>
  );
}

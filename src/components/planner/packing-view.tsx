"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Lightbulb, Printer, Trash2 } from "lucide-react";
import { ItemImage } from "@/components/closet/item-image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deletePacking, setPackingChecked } from "@/app/(app)/planner/actions";
import { cn } from "@/lib/utils";

export type PackingPlan = {
  summary?: string;
  forecast?: string;
  days?: { date: string; label: string; item_ids: string[]; note: string }[];
  checklist?: { key: string; name: string; item_id: string | null; qty: number; group: string }[];
  tips?: string[];
};

type Mini = { id: string; name: string; image_url: string | null; color: string | null };

export function PackingView({
  id,
  destination,
  start,
  end,
  plan,
  checked: initialChecked,
  items,
}: {
  id: string;
  destination: string;
  start: string;
  end: string;
  plan: PackingPlan;
  checked: string[];
  items: Mini[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [checked, setChecked] = useState<Set<string>>(new Set(initialChecked));
  const [pending, start_] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const byId = new Map(items.map((i) => [i.id, i]));
  const list = plan.checklist ?? [];
  const groups = Array.from(new Set(list.map((c) => c.group)));

  function toggle(key: string) {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setPackingChecked(id, [...n]), 600);
      return n;
    });
  }

  const pct = list.length ? Math.round((checked.size / list.length) * 100) : 0;
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(d + "T00:00:00").toLocaleDateString(undefined, o);

  return (
    <div className="mt-4">
      <h1 className="font-display text-5xl tracking-tight">{destination}</h1>
      <p className="mt-1 text-fg-muted">
        {fmt(start, { month: "short", day: "numeric" })} – {fmt(end, { month: "short", day: "numeric", year: "numeric" })}
      </p>
      {plan.summary && <p className="mt-4 max-w-2xl text-fg-muted">{plan.summary}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
        <div className="h-2 w-48 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm text-fg-muted">{checked.size}/{list.length} packed</span>
        <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-danger"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this packing list?")) return;
            start_(async () => {
              const r = await deletePacking(id);
              if ("error" in r && r.error) toast(r.error, { tone: "error" });
              else router.push("/planner/packing");
            });
          }}
        >
          <Trash2 className="size-4" /> Delete
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-medium">Checklist</h2>
          {groups.map((g) => (
            <div key={g} className="mt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle">{g}</p>
              <ul className="mt-2 space-y-1">
                {list.filter((c) => c.group === g).map((c) => {
                  const on = checked.has(c.key);
                  const it = c.item_id ? byId.get(c.item_id) : null;
                  return (
                    <li key={c.key}>
                      <button onClick={() => toggle(c.key)} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-surface">
                        <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-accent bg-accent text-accent-fg" : "border-border")}>
                          {on && <Check className="size-3.5" />}
                        </span>
                        {it && <ItemImage src={it.image_url} alt="" tint={it.color ?? undefined} className="size-9 shrink-0 rounded-lg" />}
                        <span className={cn("flex-1 text-sm", on && "text-fg-subtle line-through")}>{c.name}</span>
                        {c.qty > 1 && <span className="text-xs text-fg-subtle">×{c.qty}</span>}
                        {!it && g === "Clothes" && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning">not in closet</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {plan.tips && plan.tips.length > 0 && (
            <div className="rounded-3xl bg-surface/60 p-5">
              <p className="flex items-center gap-2 font-medium"><Lightbulb className="size-4 text-accent" /> Tips</p>
              <ul className="mt-3 space-y-2 text-sm text-fg-muted">
                {plan.tips.map((t) => <li key={t}>· {t}</li>)}
              </ul>
            </div>
          )}
          <div>
            <h2 className="text-lg font-medium">Day by day</h2>
            <div className="mt-3 space-y-3">
              {plan.days?.map((d) => (
                <div key={d.date + d.label} className="rounded-2xl border border-border p-4">
                  <p className="text-sm font-medium">
                    {/^\d{4}-\d{2}-\d{2}$/.test(d.date) ? fmt(d.date, { weekday: "short", month: "short", day: "numeric" }) : d.date}
                    {d.label && <span className="text-fg-subtle"> · {d.label}</span>}
                  </p>
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {d.item_ids.map((iid) => {
                      const it = byId.get(iid);
                      return it ? (
                        <Link key={iid} href={`/closet/${iid}`} className="w-14 shrink-0" title={it.name}>
                          <ItemImage src={it.image_url} alt={it.name} tint={it.color ?? undefined} className="aspect-[3/4] rounded-lg" />
                        </Link>
                      ) : null;
                    })}
                  </div>
                  {d.note && <p className="mt-2 text-xs text-fg-muted">{d.note}</p>}
                </div>
              ))}
            </div>
          </div>
          {plan.forecast && (
            <details className="rounded-2xl bg-surface/60 p-4 text-xs text-fg-muted">
              <summary className="cursor-pointer text-sm text-fg">Forecast used</summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans">{plan.forecast}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, Download, Layers, Luggage, Palette, Plus, Search, Shirt, Shuffle, Sparkles, type LucideIcon } from "lucide-react";
import { appNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const EVENT = "mirra:palette";
export const openPalette = () => window.dispatchEvent(new Event(EVENT));

type Entry = { id: string; label: string; hint: string; icon: LucideIcon; href: string; keywords?: string };

const ACTIONS: Entry[] = [
  { id: "a-add", label: "Add to closet", hint: "Action", icon: Plus, href: "/closet/add", keywords: "new item upload photo" },
  { id: "a-fit", label: "New Fit Check", hint: "Action", icon: Camera, href: "/fit-check", keywords: "rate score outfit" },
  { id: "a-shuffle", label: "Build an outfit", hint: "Action", icon: Shuffle, href: "/try-on", keywords: "studio avatar try on shuffle" },
  { id: "a-ask", label: "Ask the stylist", hint: "Action", icon: Sparkles, href: "/stylist", keywords: "chat ai help" },
  { id: "a-pack", label: "New packing list", hint: "Action", icon: Luggage, href: "/planner/packing", keywords: "trip travel" },
  { id: "a-color", label: "Color analysis", hint: "Action", icon: Palette, href: "/profile/colors", keywords: "season palette undertone" },
  { id: "a-laundry", label: "Laundry basket", hint: "Action", icon: Shirt, href: "/closet/laundry", keywords: "dirty wash clean" },
  { id: "a-export", label: "Export my data", hint: "Action", icon: Download, href: "/api/export?format=json", keywords: "download backup json" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [data, setData] = useState<Entry[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener(EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    if (data) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("items").select("id, name, category, brand, tags").eq("archived", false).limit(500),
      supabase.from("outfits").select("id, name, occasion").limit(300),
    ]).then(([items, outfits]) => {
      setData([
        ...(items.data ?? []).map((i) => ({ id: `i-${i.id}`, label: i.name, hint: i.category, icon: Shirt, href: `/closet/${i.id}`, keywords: [i.brand, ...(i.tags ?? [])].join(" ") })),
        ...(outfits.data ?? []).map((o) => ({ id: `o-${o.id}`, label: o.name, hint: "Outfit", icon: Layers, href: `/outfits/${o.id}`, keywords: o.occasion ?? "" })),
      ]);
    });
  }, [open, data]);

  const results = useMemo(() => {
    const pages: Entry[] = appNav.map((n) => ({ id: `p-${n.href}`, label: n.label, hint: "Page", icon: n.icon, href: n.href }));
    const all = [...ACTIONS, ...pages, ...(data ?? [])];
    const needle = q.trim().toLowerCase();
    if (!needle) return [...ACTIONS.slice(0, 5), ...pages];
    const words = needle.split(/\s+/);
    return all
      .map((e) => {
        const hay = `${e.label} ${e.hint} ${e.keywords ?? ""}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return null;
        const score = (e.label.toLowerCase().startsWith(needle) ? 3 : 0) + (e.hint === "Action" ? 1 : 0);
        return { e, score };
      })
      .filter((x): x is { e: Entry; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((x) => x.e);
  }, [q, data]);

  function go(e: Entry | undefined) {
    if (!e) return;
    setOpen(false);
    if (e.href.startsWith("/api/")) window.location.href = e.href;
    else router.push(e.href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div role="dialog" aria-label="Search Mirra" className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 text-fg-subtle" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[active]);
              } else if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search pieces, outfits, pages, actions…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
            aria-controls="palette-results"
          />
          <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-fg-subtle">Esc</kbd>
        </div>
        <ul id="palette-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-fg-subtle">{data ? "No matches" : "Loading…"}</li>}
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === active}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm", i === active ? "bg-surface-2" : "")}
              >
                <r.icon className="size-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                <span className="shrink-0 text-xs capitalize text-fg-subtle">{r.hint}</span>
                {i === active && <ArrowRight className="size-3.5 text-fg-subtle" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

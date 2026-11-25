"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { appNav } from "@/lib/nav";
import { openPalette } from "@/components/shell/command-palette";

function typing(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}

/** Gmail-style shortcuts: g + key to jump, n to add, / to search, ? for help. */
export function Shortcuts() {
  const router = useRouter();
  const [help, setHelp] = useState(false);
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
      if (pendingG.current) {
        const target = appNav.find((n) => n.key === e.key.toLowerCase());
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        if (target) {
          e.preventDefault();
          router.push(target.href);
        }
        return;
      }
      if (e.key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
      } else if (e.key === "?") {
        e.preventDefault();
        setHelp((h) => !h);
      } else if (e.key === "/") {
        e.preventDefault();
        openPalette();
      } else if (e.key === "n") {
        e.preventDefault();
        router.push("/closet/add");
      } else if (e.key === "Escape") setHelp(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (!help) return null;
  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setHelp(false)}>
      <div role="dialog" aria-label="Keyboard shortcuts" className="w-full max-w-md rounded-3xl border border-border bg-bg-elevated p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl">Shortcuts</h2>
          <button onClick={() => setHelp(false)} aria-label="Close"><X className="size-5" /></button>
        </div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {[
            ["Ctrl / ⌘ K", "Search everything"],
            ["/", "Search"],
            ["n", "Add to closet"],
            ["?", "This help"],
            ...appNav.filter((n) => n.key).map((n) => [`g then ${n.key}`, n.label]),
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt><kbd className="rounded-md bg-surface-2 px-2 py-0.5 font-sans text-xs">{k}</kbd></dt>
              <dd className="text-fg-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { GitCompare, Grid3x3, Palette, Ticket } from "lucide-react";
import { CapsuleBuilder } from "@/components/tools/capsule-builder";
import { ColorLab } from "@/components/tools/color-lab";
import { WhichOne } from "@/components/tools/which-one";
import { DressCode } from "@/components/tools/dress-code";
import type { ItemWithImage } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "capsule", label: "Capsule builder", icon: Grid3x3 },
  { id: "color", label: "Color Lab", icon: Palette },
  { id: "which", label: "Which one?", icon: GitCompare },
  { id: "dresscode", label: "Dress code", icon: Ticket },
] as const;

export function ToolsTabs({ initialTab, items, palette }: { initialTab?: string; items: ItemWithImage[]; palette: { best: string[]; avoid: string[] } }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>(TABS.some((t) => t.id === initialTab) ? (initialTab as (typeof TABS)[number]["id"]) : "capsule");
  return (
    <div className="mt-8">
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-surface p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm", tab === t.id ? "bg-surface-2 text-fg" : "text-fg-subtle hover:text-fg")}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {tab === "capsule" && <CapsuleBuilder items={items} palette={palette} />}
        {tab === "color" && <ColorLab items={items} palette={palette} />}
        {tab === "which" && <WhichOne />}
        {tab === "dresscode" && <DressCode items={items} />}
      </div>
    </div>
  );
}

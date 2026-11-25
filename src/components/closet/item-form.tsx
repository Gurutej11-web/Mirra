"use client";

import { useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, SEASONS } from "@/lib/types";
import type { ItemInput } from "@/lib/item-schema";
import { colorName, normalizeHex } from "@/lib/colors";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-accent";

export function emptyDraft(partial: Partial<ItemInput> = {}): ItemInput {
  return {
    name: "",
    category: "top",
    subcategory: null,
    colors: [],
    pattern: null,
    material: null,
    formality: 2,
    seasons: [],
    tags: [],
    brand: null,
    price: null,
    source_url: null,
    purchased_on: null,
    notes: null,
    wear_goal: null,
    ...partial,
  };
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

const nullable = (v: string) => (v.trim() ? v : null);

export function ItemForm({
  value,
  onChange,
  compact = false,
}: {
  value: ItemInput;
  onChange: (v: ItemInput) => void;
  compact?: boolean;
}) {
  const [more, setMore] = useState(!compact);
  const [tagText, setTagText] = useState("");
  const set = <K extends keyof ItemInput>(k: K, v: ItemInput[K]) => onChange({ ...value, [k]: v });

  function addTag() {
    const t = tagText.trim().toLowerCase().slice(0, 24);
    if (t && !value.tags.includes(t) && value.tags.length < 10) set("tags", [...value.tags, t]);
    setTagText("");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <input className={inputClass} value={value.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Navy cable-knit sweater" />
        </Field>
        <Field label="Category">
          <select className={inputClass} value={value.category} onChange={(e) => set("category", e.target.value as ItemInput["category"])}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <input className={inputClass} value={value.subcategory ?? ""} maxLength={40} onChange={(e) => set("subcategory", nullable(e.target.value))} placeholder="e.g. hoodie" />
        </Field>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-fg-muted">Colors</span>
        <div className="flex flex-wrap items-center gap-2">
          {value.colors.map((c, i) => (
            <span key={`${c}-${i}`} className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-1 pr-2 text-xs">
              <label className="relative size-6 cursor-pointer overflow-hidden rounded-full border border-white/15" style={{ background: c }} title="Change color">
                <input
                  type="color"
                  value={c}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => set("colors", value.colors.map((x, j) => (j === i ? e.target.value : x)))}
                />
              </label>
              <span className="capitalize text-fg-muted">{colorName(c)}</span>
              <button type="button" aria-label="Remove color" onClick={() => set("colors", value.colors.filter((_, j) => j !== i))}>
                <X className="size-3.5 text-fg-subtle hover:text-fg" />
              </button>
            </span>
          ))}
          {value.colors.length < 4 && (
            <label className="relative flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-border text-fg-subtle hover:text-fg" title="Add color">
              <Plus className="size-4" />
              <input
                type="color"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => {
                  const hex = normalizeHex(e.target.value);
                  if (hex) set("colors", [...value.colors, hex]);
                }}
              />
            </label>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-fg-muted">Formality</span>
        <div className="grid grid-cols-5 gap-1 rounded-xl bg-surface p-1">
          {["Lounge", "Casual", "Smart", "Dressy", "Formal"].map((l, i) => (
            <button
              key={l}
              type="button"
              onClick={() => set("formality", i + 1)}
              className={cn(
                "h-8 rounded-lg text-xs transition-colors",
                value.formality === i + 1 ? "bg-surface-2 text-fg" : "text-fg-subtle hover:text-fg",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-fg-muted">Seasons</span>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => {
            const on = value.seasons.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => set("seasons", on ? value.seasons.filter((x) => x !== s) : [...value.seasons, s])}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs capitalize",
                  on ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-fg-muted">Tags</span>
        <div className="flex flex-wrap items-center gap-2">
          {value.tags.map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs">
              {t}
              <button type="button" aria-label={`Remove ${t}`} onClick={() => set("tags", value.tags.filter((x) => x !== t))}>
                <X className="size-3 text-fg-subtle hover:text-fg" />
              </button>
            </span>
          ))}
          <input
            className="h-8 min-w-24 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-subtle"
            placeholder="Add tag + Enter"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
          />
        </div>
      </div>

      {compact && (
        <button type="button" onClick={() => setMore(!more)} className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg">
          <ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} />
          {more ? "Fewer details" : "More details (brand, price, care notes…)"}
        </button>
      )}

      {more && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pattern">
            <input className={inputClass} value={value.pattern ?? ""} maxLength={30} onChange={(e) => set("pattern", nullable(e.target.value))} placeholder="solid, striped…" />
          </Field>
          <Field label="Material">
            <input className={inputClass} value={value.material ?? ""} maxLength={40} onChange={(e) => set("material", nullable(e.target.value))} placeholder="cotton, wool…" />
          </Field>
          <Field label="Brand">
            <input className={inputClass} value={value.brand ?? ""} maxLength={40} onChange={(e) => set("brand", nullable(e.target.value))} />
          </Field>
          <Field label="Price paid ($)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={value.price ?? ""}
              onChange={(e) => {
                const n = parseFloat(e.target.value.replace(/[^0-9.]/g, ""));
                set("price", Number.isFinite(n) ? Math.min(n, 100000) : null);
              }}
            />
          </Field>
          <Field label="Bought on">
            <input type="date" className={inputClass} value={value.purchased_on ?? ""} onChange={(e) => set("purchased_on", nullable(e.target.value))} />
          </Field>
          <Field label="Wear goal (times)">
            <input
              className={inputClass}
              inputMode="numeric"
              placeholder="e.g. 30"
              value={value.wear_goal ?? ""}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                set("wear_goal", Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : null);
              }}
            />
          </Field>
          <Field label="Notes & care instructions" className="sm:col-span-2">
            <textarea
              className={cn(inputClass, "h-20 py-2.5")}
              maxLength={500}
              value={value.notes ?? ""}
              onChange={(e) => set("notes", nullable(e.target.value))}
              placeholder="Cold wash, hang dry. Runs small."
            />
          </Field>
        </div>
      )}
    </div>
  );
}

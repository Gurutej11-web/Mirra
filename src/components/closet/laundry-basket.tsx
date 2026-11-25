"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Droplets, Loader2, Sparkles, WashingMachine } from "lucide-react";
import { ItemImage } from "@/components/closet/item-image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { patchItems } from "@/app/(app)/closet/actions";
import { colorFamily } from "@/lib/colors";
import type { ItemWithImage } from "@/lib/types";

/** Group washables into darks / lights / colors (dry cleaning separate). */
function load(i: ItemWithImage) {
  if (i.status === "dry_cleaning") return "Dry cleaning";
  const c = i.colors[0];
  if (!c) return "Colors";
  const f = colorFamily(c);
  if (["black", "grey", "brown"].includes(f) || (f === "blue" && /navy|indigo|denim/i.test(i.name + (i.material ?? "")))) return "Darks";
  if (["white", "cream", "beige"].includes(f)) return "Lights";
  return "Colors";
}

export function LaundryBasket({ items }: { items: ItemWithImage[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  function clean(ids: string[], msg: string) {
    start(async () => {
      const r = await patchItems(ids, { status: "clean" });
      if ("error" in r && r.error) toast(r.error, { tone: "error" });
      else {
        toast(msg);
        router.refresh();
      }
    });
  }

  if (!items.length)
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center">
        <Sparkles className="mx-auto size-10 text-accent" />
        <p className="mt-4 font-display text-3xl">All clean!</p>
        <p className="mt-2 text-sm text-fg-muted">Nothing in the basket.</p>
      </div>
    );

  const groups = ["Darks", "Lights", "Colors", "Dry cleaning"]
    .map((g) => ({ g, its: items.filter((i) => load(i) === g) }))
    .filter((x) => x.its.length);

  return (
    <div className="mt-8">
      <Button onClick={() => clean(items.map((i) => i.id), `Washed ${items.length} pieces`)} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <WashingMachine className="size-4" />} Everything&apos;s clean
      </Button>
      <div className="mt-8 space-y-10">
        {groups.map(({ g, its }) => (
          <div key={g}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-medium"><Droplets className="size-4 text-accent" /> {g} <span className="text-sm text-fg-subtle">{its.length}</span></h2>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => clean(its.map((i) => i.id), `${g} done`)}>
                <Check className="size-3.5" /> {g === "Dry cleaning" ? "Picked up" : "Washed this load"}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
              {its.map((i) => (
                <button key={i.id} onClick={() => clean([i.id], `${i.name} is clean`)} disabled={pending} className="group text-left" title="Mark clean">
                  <div className="relative">
                    <ItemImage src={i.image_url} alt={i.name} tint={i.colors[0]} className="aspect-[3/4] rounded-2xl" />
                    <span className="absolute inset-0 grid place-items-center rounded-2xl bg-bg/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <Check className="size-6 text-success" />
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-fg-muted">{i.name}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

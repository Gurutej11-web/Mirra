import { Droplets, Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCloset } from "@/lib/storage";
import { ButtonLink } from "@/components/ui/button";
import { ClosetGrid } from "@/components/closet/closet-grid";

export const metadata = { title: "Closet" };

export default async function ClosetPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { supabase, profile } = await getSession();
  const { items } = await getCloset(supabase);
  const { welcome } = await searchParams;

  const value = items.reduce((s, i) => s + (i.price ?? 0), 0);
  const dirty = items.filter((i) => i.status !== "clean").length;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle">
            {welcome ? "Welcome to Mirra" : "Your wardrobe"}
          </p>
          <h1 className="mt-2 font-display text-5xl tracking-tight md:text-6xl">
            {welcome ? `Let's fill it up, ${profile?.display_name ?? "friend"}.` : "Closet"}
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            {items.length} piece{items.length === 1 ? "" : "s"}
            {value > 0 && ` · $${Math.round(value).toLocaleString()} total value`}
          </p>
        </div>
        <div className="flex gap-2">
          {dirty > 0 && (
            <ButtonLink href="/closet/laundry" variant="secondary">
              <Droplets className="size-4" /> Laundry {dirty}
            </ButtonLink>
          )}
          <ButtonLink href="/closet/add">
            <Plus className="size-4" /> Add items
          </ButtonLink>
        </div>
      </div>
      <ClosetGrid items={items} />
    </section>
  );
}

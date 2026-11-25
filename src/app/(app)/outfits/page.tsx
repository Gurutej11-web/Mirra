import { getSession } from "@/lib/session";
import { getCloset } from "@/lib/storage";
import { OutfitsBoard } from "@/components/outfits/outfits-board";
import type { Lookbook, Outfit } from "@/lib/types";

export const metadata = { title: "Outfits" };

export default async function OutfitsPage() {
  const { supabase, profile } = await getSession();
  const [{ items }, { data: outfits }, { data: lookbooks }] = await Promise.all([
    getCloset(supabase, { includeArchived: true }),
    supabase.from("outfits").select("*").order("created_at", { ascending: false }),
    supabase.from("lookbooks").select("*").order("created_at"),
  ]);

  return (
    <section>
      <h1 className="font-display text-5xl tracking-tight md:text-6xl">Outfits</h1>
      <p className="mt-2 text-sm text-fg-muted">Your saved looks, organized into lookbooks.</p>
      <OutfitsBoard
        outfits={(outfits ?? []) as Outfit[]}
        lookbooks={(lookbooks ?? []) as Lookbook[]}
        items={items.map((i) => ({ id: i.id, name: i.name, category: i.category, image_url: i.image_url, colors: i.colors }))}
        avatar={profile?.avatar_config ?? {}}
      />
    </section>
  );
}

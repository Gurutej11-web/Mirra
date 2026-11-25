import Link from "next/link";
import { ArrowLeft, Archive } from "lucide-react";
import { getSession } from "@/lib/session";
import { withImages } from "@/lib/storage";
import { ItemImage } from "@/components/closet/item-image";
import type { Item } from "@/lib/types";

export const metadata = { title: "Archive" };

export default async function ArchivePage() {
  const { supabase } = await getSession();
  const { data } = await supabase.from("items").select("*").eq("archived", true).order("created_at", { ascending: false });
  const items = await withImages(supabase, (data ?? []) as Item[]);

  return (
    <section>
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Profile
      </Link>
      <h1 className="mt-4 font-display text-5xl tracking-tight">Archive</h1>
      <p className="mt-2 text-sm text-fg-muted">Donated, sold or stored pieces. They&apos;re hidden from suggestions but keep their history. Open one to restore it.</p>
      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center text-sm text-fg-muted">
          <Archive className="mx-auto size-10 text-accent" />
          <p className="mt-4">Nothing archived.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((i) => (
            <Link key={i.id} href={`/closet/${i.id}`} className="opacity-80 transition-opacity hover:opacity-100">
              <ItemImage src={i.image_url} alt={i.name} tint={i.colors[0]} className="aspect-[3/4] rounded-2xl grayscale-[40%]" />
              <p className="mt-1 truncate text-sm">{i.name}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

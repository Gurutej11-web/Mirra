import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCloset, signedUrl } from "@/lib/storage";
import { goesWith } from "@/lib/outfit-engine";
import { ItemDetail } from "@/components/closet/item-detail";
import type { Item } from "@/lib/types";

export const metadata = { title: "Item" };

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase } = await getSession();
  const { data } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const item = data as Item;

  const [{ items: closet }, originalUrl, cutoutUrl, { data: outfits }, { data: wears }] = await Promise.all([
    getCloset(supabase),
    signedUrl(supabase, "closet", item.image_path),
    signedUrl(supabase, "closet", item.cutout_path),
    supabase.from("outfits").select("id, name").contains("item_ids", [id]).limit(12),
    supabase.from("wear_log").select("worn_on").contains("item_ids", [id]).order("worn_on", { ascending: false }).limit(60),
  ]);

  const pairs = goesWith(item, closet, 8).map((p) => p.item);

  return (
    <section>
      <Link href="/closet" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Closet
      </Link>
      <ItemDetail
        item={item}
        originalUrl={originalUrl}
        cutoutUrl={cutoutUrl}
        pairs={pairs.map((p) => ({ id: p.id, name: p.name, image_url: p.image_url, color: p.colors[0] ?? null }))}
        outfits={outfits ?? []}
        wearDates={(wears ?? []).map((w) => w.worn_on as string)}
      />
    </section>
  );
}

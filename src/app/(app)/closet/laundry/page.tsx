import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { withImages } from "@/lib/storage";
import { LaundryBasket } from "@/components/closet/laundry-basket";
import type { Item } from "@/lib/types";

export const metadata = { title: "Laundry" };

export default async function LaundryPage() {
  const { supabase } = await getSession();
  const { data } = await supabase.from("items").select("*").eq("archived", false).neq("status", "clean").order("last_worn", { ascending: true });
  const items = await withImages(supabase, (data ?? []) as Item[]);

  return (
    <section>
      <Link href="/closet" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Closet
      </Link>
      <h1 className="mt-4 font-display text-5xl tracking-tight">Laundry basket</h1>
      <p className="mt-2 text-sm text-fg-muted">Worn tops, bottoms and dresses land here automatically. Clean them out to get them back into outfit picks.</p>
      <LaundryBasket items={items} />
    </section>
  );
}

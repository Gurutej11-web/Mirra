import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCloset } from "@/lib/storage";
import { AddItem } from "@/components/closet/add-item";

export const metadata = { title: "Add to closet" };

export default async function AddItemPage() {
  const { supabase, user } = await getSession();
  const { items } = await getCloset(supabase);

  return (
    <section className="mx-auto max-w-3xl">
      <Link href="/closet" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Closet
      </Link>
      <h1 className="mt-4 font-display text-5xl tracking-tight">Add to your closet</h1>
      <p className="mt-2 text-fg-muted">Three ways in. Everything is private to you.</p>
      <div className="mt-8">
        <AddItem
          userId={user.id}
          existing={items.map((i) => ({ id: i.id, name: i.name, category: i.category, colors: i.colors, image_url: i.image_url }))}
        />
      </div>
    </section>
  );
}

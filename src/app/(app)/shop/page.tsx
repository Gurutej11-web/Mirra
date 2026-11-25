import { getSession } from "@/lib/session";
import { getCloset, signedUrls } from "@/lib/storage";
import { ShopTools } from "@/components/shop/shop-tools";
import type { WishlistItem } from "@/lib/types";

export const metadata = { title: "Smart shopping" };

export default async function ShopPage() {
  const { supabase, user } = await getSession();
  const [{ items }, { data }] = await Promise.all([
    getCloset(supabase),
    supabase.from("wishlist").select("*").order("created_at", { ascending: false }),
  ]);
  const wish = (data ?? []) as WishlistItem[];
  const stored = wish.map((w) => w.image_url).filter((u): u is string => !!u?.startsWith("closet:")).map((u) => u.slice(7));
  const signed = await signedUrls(supabase, "closet", stored);

  return (
    <section>
      <h1 className="font-display text-5xl tracking-tight md:text-6xl">Smart shopping</h1>
      <p className="mt-2 max-w-xl text-sm text-fg-muted">Buy less, wear more. Check anything before you buy it, and find the pieces your closet is actually missing.</p>
      <ShopTools
        userId={user.id}
        items={items.map((i) => ({ id: i.id, name: i.name, image_url: i.image_url, color: i.colors[0] ?? null }))}
        wishlist={wish.map((w) => ({
          ...w,
          image_url: w.image_url?.startsWith("closet:") ? (signed.get(w.image_url.slice(7)) ?? null) : w.image_url,
        }))}
        closetSize={items.length}
      />
    </section>
  );
}

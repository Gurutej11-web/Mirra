import { getSession } from "@/lib/session";
import { getCloset, signedUrl } from "@/lib/storage";
import { Studio, type StudioInitial } from "@/components/tryon/studio";
import type { Lookbook, Outfit } from "@/lib/types";

export const metadata = { title: "Try-On studio" };

export default async function TryOnPage({ searchParams }: { searchParams: Promise<{ with?: string; outfit?: string; items?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await getSession();
  const [{ items }, photoUrl, { data: lookbooks }] = await Promise.all([
    getCloset(supabase),
    signedUrl(supabase, "avatars", profile?.tryon_photo_path ?? null),
    supabase.from("lookbooks").select("*").order("created_at"),
  ]);

  const isId = (s?: string) => !!s && /^[0-9a-f-]{36}$/i.test(s);
  let initial: StudioInitial | null = null;
  if (isId(sp.outfit)) {
    const { data } = await supabase.from("outfits").select("*").eq("id", sp.outfit!).maybeSingle();
    if (data) {
      const o = data as Outfit;
      initial = { outfitId: o.id, name: o.name, occasion: o.occasion, lookbook_id: o.lookbook_id, item_ids: o.item_ids, layout: o.layout };
    }
  } else if (sp.items) {
    initial = { item_ids: sp.items.split(",").filter(isId).slice(0, 12), layout: {} };
  } else if (isId(sp.with)) {
    initial = { item_ids: [sp.with!], layout: {} };
  }

  return (
    <section>
      <h1 className="font-display text-5xl tracking-tight md:text-6xl">Try-On studio</h1>
      <p className="mt-2 max-w-xl text-sm text-fg-muted">
        Dress your avatar — or a photo of you — with pieces from your closet. Drag to position, shuffle for ideas, save the looks you love.
      </p>
      <Studio
        userId={user.id}
        items={items}
        avatar={profile?.avatar_config ?? {}}
        photoUrl={photoUrl}
        lookbooks={(lookbooks ?? []) as Lookbook[]}
        initial={initial}
        palette={{ best: profile?.palette?.best ?? [], avoid: profile?.palette?.avoid ?? [] }}
      />
    </section>
  );
}

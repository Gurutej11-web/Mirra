import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCloset } from "@/lib/storage";
import { scoreOutfit } from "@/lib/outfit-engine";
import { OutfitDetail } from "@/components/outfits/outfit-detail";
import type { Lookbook, Outfit } from "@/lib/types";

export const metadata = { title: "Outfit" };

export default async function OutfitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, profile } = await getSession();
  const [{ data }, { items }, { data: lookbooks }, { data: wears }] = await Promise.all([
    supabase.from("outfits").select("*").eq("id", id).maybeSingle(),
    getCloset(supabase, { includeArchived: true }),
    supabase.from("lookbooks").select("*").order("created_at"),
    supabase.from("wear_log").select("worn_on").eq("outfit_id", id).order("worn_on", { ascending: false }).limit(30),
  ]);
  if (!data) notFound();
  const outfit = data as Outfit;
  const its = outfit.item_ids.map((i) => items.find((x) => x.id === i)).filter((x) => !!x);
  const score = its.length >= 2 ? scoreOutfit(its, { bestColors: profile?.palette?.best, avoidColors: profile?.palette?.avoid }) : null;

  return (
    <section>
      <Link href="/outfits" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Outfits
      </Link>
      <OutfitDetail
        outfit={outfit}
        items={its.map((i) => ({ id: i.id, name: i.name, category: i.category, image_url: i.image_url, colors: i.colors, status: i.status }))}
        avatar={profile?.avatar_config ?? {}}
        lookbooks={(lookbooks ?? []) as Lookbook[]}
        score={score}
        hideScores={!!profile?.hide_scores}
        wearDates={(wears ?? []).map((w) => w.worn_on as string)}
        missing={outfit.item_ids.length - its.length}
      />
    </section>
  );
}

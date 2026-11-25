import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCloset, signedUrls } from "@/lib/storage";
import { FitCapture } from "@/components/fitcheck/fit-capture";
import type { FitCheck, Outfit } from "@/lib/types";

export const metadata = { title: "Fit Check" };

export default async function FitCheckPage({ searchParams }: { searchParams: Promise<{ outfit?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await getSession();

  let outfit: { name: string; occasion: string | null; images: string[] } | null = null;
  if (sp.outfit && /^[0-9a-f-]{36}$/i.test(sp.outfit)) {
    const { data } = await supabase.from("outfits").select("*").eq("id", sp.outfit).maybeSingle();
    if (data) {
      const o = data as Outfit;
      const { items } = await getCloset(supabase, { includeArchived: true });
      outfit = {
        name: o.name,
        occasion: o.occasion,
        images: o.item_ids.map((id) => items.find((i) => i.id === id)?.image_url).filter((x): x is string => !!x),
      };
    }
  }

  const { data: recent } = await supabase
    .from("fit_checks")
    .select("id, photo_path, total_score, headline, created_at")
    .order("created_at", { ascending: false })
    .limit(6);
  const checks = (recent ?? []) as Pick<FitCheck, "id" | "photo_path" | "total_score" | "headline" | "created_at">[];
  const urls = await signedUrls(supabase, "fit-checks", checks.map((c) => c.photo_path));

  return (
    <section>
      <h1 className="font-display text-5xl tracking-tight md:text-6xl">Fit Check</h1>
      <p className="mt-2 max-w-xl text-sm text-fg-muted">An honest second opinion with a score, a breakdown, and fixes — often from your own closet.</p>
      <div className="mt-8">
        <FitCapture defaultMode={profile?.roast_mode ? "roast" : "honest"} outfit={outfit} />
      </div>

      {checks.length > 0 && (
        <div className="mt-14">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent checks</h2>
            <Link href="/fit-check/history" className="flex items-center gap-1 text-sm text-accent hover:underline">
              History & trends <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {checks.map((c) => (
              <Link key={c.id} href={`/fit-check/${c.id}`} className="group relative overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls.get(c.photo_path) ?? ""} alt={c.headline ?? "Fit check"} className="aspect-[3/4] w-full bg-surface object-cover transition-transform group-hover:scale-105" />
                {!profile?.hide_scores && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-bg/80 px-2 py-0.5 font-display text-lg backdrop-blur">{c.total_score}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

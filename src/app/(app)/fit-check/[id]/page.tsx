import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { signedUrl, withImages } from "@/lib/storage";
import { FitResult } from "@/components/fitcheck/fit-result";
import type { FitCheck, Item } from "@/lib/types";

export const metadata = { title: "Fit Check result" };

export default async function FitResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, profile } = await getSession();
  const { data } = await supabase.from("fit_checks").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const check = data as FitCheck;

  const itemIds = check.tips.map((t) => t.item_id).filter((x): x is string => !!x);
  const [photoUrl, { data: tipItems }, { data: prev }] = await Promise.all([
    signedUrl(supabase, "fit-checks", check.photo_path),
    itemIds.length ? supabase.from("items").select("*").in("id", itemIds) : Promise.resolve({ data: [] }),
    supabase.from("fit_checks").select("total_score").lt("created_at", check.created_at).order("created_at", { ascending: false }).limit(1),
  ]);
  const items = await withImages(supabase, (tipItems ?? []) as Item[]);

  return (
    <section>
      <Link href="/fit-check" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> New Fit Check
      </Link>
      <FitResult
        check={check}
        photoUrl={photoUrl}
        items={items.map((i) => ({ id: i.id, name: i.name, image_url: i.image_url, color: i.colors[0] ?? null }))}
        previousScore={(prev?.[0]?.total_score as number | undefined) ?? null}
        hideScores={!!profile?.hide_scores}
      />
    </section>
  );
}

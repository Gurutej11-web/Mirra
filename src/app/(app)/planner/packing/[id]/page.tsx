import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCloset } from "@/lib/storage";
import { PackingView, type PackingPlan } from "@/components/planner/packing-view";

export const metadata = { title: "Packing list" };

export default async function PackingListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await getSession();
  const [{ data }, { items }] = await Promise.all([
    supabase.from("packing_lists").select("*").eq("id", id).maybeSingle(),
    getCloset(supabase, { includeArchived: true }),
  ]);
  if (!data) notFound();

  return (
    <section>
      <Link href="/planner/packing" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg print:hidden">
        <ArrowLeft className="size-4" /> Packing lists
      </Link>
      <PackingView
        id={data.id}
        destination={data.destination}
        start={data.start_date}
        end={data.end_date}
        plan={data.plan as PackingPlan}
        checked={data.checked ?? []}
        items={items.map((i) => ({ id: i.id, name: i.name, image_url: i.image_url, color: i.colors[0] ?? null }))}
      />
    </section>
  );
}

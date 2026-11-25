import Link from "next/link";
import { ArrowLeft, Luggage } from "lucide-react";
import { getSession } from "@/lib/session";
import { PackingForm } from "@/components/planner/packing-form";

export const metadata = { title: "Packing lists" };

export default async function PackingPage() {
  const { supabase } = await getSession();
  const { data } = await supabase.from("packing_lists").select("id, destination, start_date, end_date, checked, plan").order("created_at", { ascending: false });
  const lists = (data ?? []) as { id: string; destination: string; start_date: string; end_date: string; checked: string[]; plan: { checklist?: unknown[] } }[];

  return (
    <section>
      <Link href="/planner" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Planner
      </Link>
      <h1 className="mt-4 font-display text-5xl tracking-tight md:text-6xl">Packing lists</h1>
      <p className="mt-2 text-sm text-fg-muted">Tell Mirra where you&apos;re going — it builds a light capsule from your closet around the forecast.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <PackingForm />
        <div>
          <h2 className="text-lg font-medium">Your trips</h2>
          {lists.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">No trips yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {lists.map((l) => {
                const total = l.plan.checklist?.length ?? 0;
                return (
                  <li key={l.id}>
                    <Link href={`/planner/packing/${l.id}`} className="flex items-center gap-4 rounded-2xl border border-border p-4 hover:bg-surface">
                      <Luggage className="size-5 text-accent" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{l.destination}</p>
                        <p className="text-xs text-fg-subtle">
                          {new Date(l.start_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
                          {new Date(l.end_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <span className="text-xs text-fg-muted">{l.checked.length}/{total} packed</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

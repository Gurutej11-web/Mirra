import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { getSession } from "@/lib/session";
import { signedUrls } from "@/lib/storage";
import { ScoreTrend } from "@/components/fitcheck/score-trend";
import { ButtonLink } from "@/components/ui/button";
import type { FitCheck } from "@/lib/types";

export const metadata = { title: "Fit Check history" };

export default async function HistoryPage() {
  const { supabase, profile } = await getSession();
  const { data } = await supabase
    .from("fit_checks")
    .select("id, photo_path, total_score, headline, breakdown, mode, occasion, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const checks = (data ?? []) as FitCheck[];
  const urls = await signedUrls(supabase, "fit-checks", checks.slice(0, 60).map((c) => c.photo_path));
  const hide = !!profile?.hide_scores;

  const scores = checks.map((c) => c.total_score ?? 0);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const best = scores.length ? Math.max(...scores) : 0;
  const cats = ["color_harmony", "fit_proportion", "style_cohesion", "occasion_match", "trend_factor"];
  const catAvg = cats.map((k) => ({
    k,
    v: checks.length ? Math.round(checks.reduce((s, c) => s + (c.breakdown?.[k] ?? 0), 0) / checks.length) : 0,
  }));
  const weakest = [...catAvg].sort((a, b) => a.v - b.v)[0];

  return (
    <section>
      <Link href="/fit-check" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Fit Check
      </Link>
      <h1 className="mt-4 font-display text-5xl tracking-tight md:text-6xl">Your style journey</h1>

      {!checks.length ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center">
          <Camera className="mx-auto size-10 text-accent" />
          <p className="mt-4 font-display text-3xl">No Fit Checks yet</p>
          <ButtonLink href="/fit-check" className="mt-6">Do your first one</ButtonLink>
        </div>
      ) : (
        <>
          {!hide && (
            <>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { l: "Fit Checks", v: checks.length },
                  { l: "Average", v: avg },
                  { l: "Best ever", v: best },
                  { l: "Work on", v: weakest.k.replace(/_/g, " ") },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl bg-surface p-4">
                    <p className="font-display text-3xl capitalize">{s.v}</p>
                    <p className="text-xs text-fg-subtle">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-3xl border border-border p-4 sm:p-6">
                <ScoreTrend data={[...checks].reverse().map((c) => ({ date: c.created_at, score: c.total_score ?? 0 }))} />
              </div>
            </>
          )}

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {checks.slice(0, 60).map((c) => (
              <Link key={c.id} href={`/fit-check/${c.id}`} className="group">
                <div className="relative overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urls.get(c.photo_path) ?? ""} alt="" className="aspect-[3/4] w-full bg-surface object-cover transition-transform group-hover:scale-105" />
                  {!hide && <span className="absolute bottom-2 left-2 rounded-full bg-bg/80 px-2.5 py-0.5 font-display text-xl backdrop-blur">{c.total_score}</span>}
                </div>
                <p className="mt-2 truncate text-sm">{c.headline}</p>
                <p className="text-xs text-fg-subtle">
                  {new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {c.occasion ?? "everyday"}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

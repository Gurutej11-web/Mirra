import Link from "next/link";
import { Archive, Copy, Flame, Recycle, Sparkles } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCloset } from "@/lib/storage";
import { costPerWear, daysSince, money, todayISO } from "@/lib/closet-utils";
import { COLOR_FAMILIES, FAMILY_SWATCH, colorDistance, colorFamily } from "@/lib/colors";
import { countOutfits } from "@/lib/outfit-engine";
import { computeBadges, streaks } from "@/lib/badges";
import { CATEGORY_LABELS, type ItemWithImage } from "@/lib/types";
import { ItemImage } from "@/components/closet/item-image";
import { CategoryBars, ColorDonut, MonthlyWears, SpendChart } from "@/components/insights/charts";
import { WearHeatmap } from "@/components/insights/heatmap";
import { BudgetForm } from "@/components/insights/budget-form";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Insights" };

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export default async function InsightsPage() {
  const { supabase, profile } = await getSession();
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  const sinceISO = since.toISOString().slice(0, 10);

  const [{ items }, { data: wears }, { count: outfitCount }, { data: checks }, { count: trips }, { count: chats }] = await Promise.all([
    getCloset(supabase, { includeArchived: true }),
    supabase.from("wear_log").select("worn_on, item_ids").gte("worn_on", sinceISO),
    supabase.from("outfits").select("id", { count: "exact", head: true }),
    supabase.from("fit_checks").select("total_score, created_at"),
    supabase.from("packing_lists").select("id", { count: "exact", head: true }),
    supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("role", "user"),
  ]);

  const active = items.filter((i) => !i.archived);
  const archived = items.filter((i) => i.archived);
  if (!active.length) {
    return (
      <section>
        <h1 className="font-display text-5xl tracking-tight md:text-6xl">Insights</h1>
        <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center">
          <Sparkles className="mx-auto size-10 text-accent" />
          <p className="mt-4 font-display text-3xl">Nothing to analyze yet</p>
          <p className="mt-2 text-sm text-fg-muted">Add clothes and log what you wear — your stats show up here.</p>
          <ButtonLink href="/closet/add" className="mt-6">Add items</ButtonLink>
        </div>
      </section>
    );
  }

  const today = todayISO();
  const wearList = (wears ?? []) as { worn_on: string; item_ids: string[] }[];
  const wearDays = wearList.map((w) => w.worn_on);
  const checkDays = (checks ?? []).map((c) => (c.created_at as string).slice(0, 10));
  const { current: streak, longest } = streaks([...wearDays, ...checkDays], today);

  // value + cost per wear
  const value = active.reduce((s, i) => s + (i.price ?? 0), 0);
  const priced = active.filter((i) => i.price != null);
  const totalWears = active.reduce((s, i) => s + i.times_worn, 0);
  const avgCpw = priced.length ? priced.reduce((s, i) => s + (costPerWear(i) ?? 0), 0) / priced.length : null;
  const wornShare = active.length ? active.filter((i) => i.times_worn > 0).length / active.length : 0;

  const mostWorn = [...active].sort((a, b) => b.times_worn - a.times_worn).filter((i) => i.times_worn > 0).slice(0, 5);
  const declutter = active.filter((i) => daysSince(i.last_worn ?? i.created_at.slice(0, 10)) >= 180 || (i.times_worn === 0 && daysSince(i.created_at) >= 90)).slice(0, 8);
  const neglected = active.filter((i) => i.times_worn === 0).length;

  // colors & categories
  const famCounts = COLOR_FAMILIES.map((f) => ({ name: f, color: FAMILY_SWATCH[f], value: active.filter((i) => i.colors[0] && colorFamily(i.colors[0]) === f).length })).filter((x) => x.value);
  const catCounts = Object.entries(CATEGORY_LABELS).map(([k, label]) => ({ name: label, value: active.filter((i) => i.category === k).length })).filter((x) => x.value);

  // monthly wears (last 12 months)
  const months: string[] = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - m);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const monthly = months.map((m) => ({ month: m, wears: wearList.filter((w) => monthKey(w.worn_on) === m).length }));

  // spending (purchased_on or created_at)
  const spend = months.map((m) => ({
    month: m,
    spent: Math.round(active.concat(archived).filter((i) => i.price != null && monthKey(i.purchased_on ?? i.created_at.slice(0, 10)) === m).reduce((s, i) => s + (i.price ?? 0), 0)),
  }));
  const thisMonth = spend[spend.length - 1].spent;
  const budget = profile?.monthly_budget != null ? Number(profile.monthly_budget) : null;

  // near-duplicates: same category + very close main color
  const dupGroups: ItemWithImage[][] = [];
  const used = new Set<string>();
  for (const a of active) {
    if (used.has(a.id) || !a.colors[0]) continue;
    const group = active.filter((b) => b.id !== a.id && !used.has(b.id) && b.category === a.category && b.colors[0] && colorDistance(a.colors[0], b.colors[0]) < 10 && (a.subcategory ?? "") === (b.subcategory ?? ""));
    if (group.length) {
      const g = [a, ...group];
      g.forEach((x) => used.add(x.id));
      dupGroups.push(g);
    }
  }

  const badges = computeBadges({
    items: active.length,
    outfits: outfitCount ?? 0,
    fitChecks: checks?.length ?? 0,
    bestScore: Math.max(0, ...((checks ?? []).map((c) => c.total_score as number))),
    paletteDone: !!profile?.palette?.season,
    streak,
    longestStreak: longest,
    wornShare,
    valueHunter: active.some((i) => (i.price ?? 0) >= 20 && (costPerWear(i) ?? 99) < 1),
    trips: trips ?? 0,
    stylistChats: chats ?? 0,
  });

  return (
    <section>
      <h1 className="font-display text-5xl tracking-tight md:text-6xl">Insights</h1>
      <p className="mt-2 text-sm text-fg-muted">How you actually use your closet.</p>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { v: active.length, l: "Pieces" },
          { v: money(value), l: "Closet value" },
          { v: countOutfits(active), l: "Possible outfits" },
          { v: avgCpw != null ? money(avgCpw) : "—", l: "Avg cost per wear" },
          { v: totalWears, l: "Total wears logged" },
          { v: `${Math.round(wornShare * 100)}%`, l: "Of closet worn" },
          { v: neglected, l: "Never worn" },
          { v: `${streak}🔥`, l: `Day streak · best ${longest}` },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl bg-surface p-4">
            <p className="font-display text-3xl">{s.v}</p>
            <p className="text-xs text-fg-subtle">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-border p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-medium"><Flame className="size-4 text-accent" /> Wear calendar</h2>
          <span className="text-xs text-fg-subtle">last 12 months</span>
        </div>
        <WearHeatmap dates={wearDays} today={today} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border p-5">
          <h2 className="font-medium">Color story</h2>
          <ColorDonut data={famCounts} />
        </div>
        <div className="rounded-3xl border border-border p-5">
          <h2 className="font-medium">Category balance</h2>
          <CategoryBars data={catCounts} />
        </div>
        <div className="rounded-3xl border border-border p-5">
          <h2 className="font-medium">Outfits logged per month</h2>
          <MonthlyWears data={monthly} />
        </div>
        <div className="rounded-3xl border border-border p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-medium">Spending</h2>
              <p className="text-xs text-fg-subtle">
                This month {money(thisMonth)}
                {budget != null && ` of ${money(budget)} budget`}
              </p>
            </div>
            <BudgetForm current={budget} />
          </div>
          {budget != null && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className={`h-full ${thisMonth > budget ? "bg-danger" : "bg-accent"}`} style={{ width: `${Math.min(100, budget ? (thisMonth / budget) * 100 : 0)}%` }} />
            </div>
          )}
          <SpendChart data={spend} budget={budget} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ItemList title="Most worn" items={mostWorn} meta={(i) => `${i.times_worn}× · ${money(costPerWear(i))}/wear`} />
        <ItemList
          title="Declutter candidates"
          icon={<Recycle className="size-4 text-accent" />}
          hint="Not worn in 6+ months (or never in 3+). Donate, sell, or give them a comeback."
          items={declutter}
          meta={(i) => (i.last_worn ? `last worn ${daysSince(i.last_worn)}d ago` : "never worn")}
        />
      </div>

      {dupGroups.length > 0 && (
        <div className="mt-6 rounded-3xl border border-border p-5">
          <h2 className="flex items-center gap-2 font-medium"><Copy className="size-4 text-accent" /> Near-duplicates</h2>
          <p className="text-xs text-fg-subtle">Same type, almost the same color. Worth knowing before you buy another.</p>
          <div className="mt-4 space-y-4">
            {dupGroups.slice(0, 6).map((g) => (
              <div key={g[0].id} className="flex items-center gap-3 overflow-x-auto">
                {g.map((i) => (
                  <Link key={i.id} href={`/closet/${i.id}`} className="w-16 shrink-0" title={i.name}>
                    <ItemImage src={i.image_url} alt={i.name} tint={i.colors[0]} className="aspect-[3/4] rounded-lg" />
                  </Link>
                ))}
                <p className="shrink-0 text-sm text-fg-muted">{g.length} similar {g[0].subcategory ?? CATEGORY_LABELS[g[0].category].toLowerCase()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-border p-5">
        <h2 className="font-medium">Badges</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {badges.map((b) => (
            <div key={b.id} className={`rounded-2xl p-3 text-center ${b.earned ? "bg-accent/10" : "bg-surface opacity-50 grayscale"}`} title={b.desc}>
              <p className="text-3xl">{b.emoji}</p>
              <p className="mt-1 text-xs font-medium">{b.name}</p>
              <p className="text-[10px] text-fg-subtle">{b.earned ? "Earned" : (b.progress ?? b.desc)}</p>
            </div>
          ))}
        </div>
      </div>

      {archived.length > 0 && (
        <p className="mt-6 flex items-center gap-2 text-sm text-fg-muted">
          <Archive className="size-4" /> {archived.length} archived piece{archived.length === 1 ? "" : "s"} —{" "}
          <Link href="/profile/archive" className="text-accent hover:underline">view archive</Link>
        </p>
      )}
    </section>
  );
}

function ItemList({ title, items, meta, hint, icon }: { title: string; items: ItemWithImage[]; meta: (i: ItemWithImage) => string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border p-5">
      <h2 className="flex items-center gap-2 font-medium">{icon}{title}</h2>
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">Nothing here — nice.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/closet/${i.id}`} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-surface">
                <ItemImage src={i.image_url} alt={i.name} tint={i.colors[0]} className="size-12 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1 truncate text-sm">{i.name}</span>
                <span className="shrink-0 text-xs text-fg-subtle">{meta(i)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Camera, Check, Flame, MessageCircle, Plus, Sparkles } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCloset } from "@/lib/storage";
import { getWeather } from "@/lib/weather";
import { daysSince, todayISO } from "@/lib/closet-utils";
import { streaks } from "@/lib/badges";
import { TodayPicks } from "@/components/planner/today-picks";
import { OutfitCanvas } from "@/components/tryon/outfit-canvas";
import { ItemImage } from "@/components/closet/item-image";
import type { Outfit } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Home" };

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function HomePage() {
  const { supabase, profile, user } = await getSession();
  const today = todayISO();
  const tomorrow = (() => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const [{ items }, weather, { data: plan }, { data: wears }, { count: checks }, { count: outfits }, { count: chats }, { data: lastCheck }] = await Promise.all([
    getCloset(supabase),
    profile?.location ? getWeather(profile.location.lat, profile.location.lon, 2) : Promise.resolve(null),
    supabase.from("planner_entries").select("outfit_id, note").eq("day", today).maybeSingle(),
    supabase.from("wear_log").select("worn_on").gte("worn_on", new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10)),
    supabase.from("fit_checks").select("id", { count: "exact", head: true }),
    supabase.from("outfits").select("id", { count: "exact", head: true }),
    supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("role", "user"),
    supabase.from("fit_checks").select("id, total_score, headline").order("created_at", { ascending: false }).limit(1),
  ]);

  let planned: { outfit: Outfit; its: typeof items } | null = null;
  if (plan?.outfit_id) {
    const { data } = await supabase.from("outfits").select("*").eq("id", plan.outfit_id).maybeSingle();
    if (data) {
      const o = data as Outfit;
      planned = { outfit: o, its: o.item_ids.map((id) => items.find((i) => i.id === id)).filter((x): x is (typeof items)[number] => !!x) };
    }
  }

  const wearDates = (wears ?? []).map((w) => w.worn_on as string);
  const { current: streak } = streaks(wearDates, today);
  const loggedToday = wearDates.includes(today);
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "";

  const steps = [
    { done: items.length >= 5, label: "Add 5 pieces to your closet", href: "/closet/add", progress: `${Math.min(items.length, 5)}/5` },
    { done: !!profile?.palette?.season, label: "Find your color season", href: "/profile/colors" },
    { done: !!profile?.location, label: "Set your city for weather picks", href: "/planner" },
    { done: (outfits ?? 0) > 0, label: "Save your first outfit", href: "/try-on" },
    { done: (checks ?? 0) > 0, label: "Do your first Fit Check", href: "/fit-check" },
    { done: (chats ?? 0) > 0, label: "Ask the stylist something", href: "/stylist" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  const nudges = items
    .filter((i) => i.status === "clean" && daysSince(i.last_worn ?? i.created_at.slice(0, 10)) >= 21)
    .sort((a, b) => daysSince(b.last_worn ?? b.created_at) - daysSince(a.last_worn ?? a.created_at))
    .slice(0, 4);

  return (
    <section className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-fg-muted">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 font-display text-5xl tracking-tight md:text-6xl">
            {greeting()}, <span className="text-gradient italic">{name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm", streak ? "bg-accent/15 text-fg" : "bg-surface text-fg-muted")}>
            <Flame className={cn("size-4", streak && "text-accent")} /> {streak} day{streak === 1 ? "" : "s"}
          </span>
          {loggedToday && <span className="flex items-center gap-1 text-sm text-success"><Check className="size-4" /> Logged today</span>}
        </div>
      </div>

      {doneCount < steps.length && (
        <div className="rounded-3xl border border-border bg-surface/40 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-medium">Get the most out of Mirra</h2>
              <p className="text-xs text-fg-subtle">{doneCount} of {steps.length} done</p>
            </div>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-accent" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className={cn("flex items-center gap-3 rounded-2xl border p-3 text-sm", s.done ? "border-transparent bg-surface text-fg-subtle" : "border-border hover:border-accent/40")}>
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", s.done ? "border-success bg-success/20 text-success" : "border-border")}>
                    {s.done && <Check className="size-3.5" />}
                  </span>
                  <span className={cn("flex-1", s.done && "line-through")}>{s.label}</span>
                  {!s.done && s.progress && <span className="text-xs text-fg-subtle">{s.progress}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {planned && (
        <div className="grid gap-6 rounded-3xl border border-accent/40 bg-accent/5 p-5 sm:grid-cols-[160px_1fr]">
          <div className="rounded-2xl bg-surface-2/60">
            <OutfitCanvas items={planned.its} layout={planned.outfit.layout} avatar={profile?.avatar_config} className="mx-auto w-3/4" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle">Planned for today</p>
            <h2 className="mt-1 font-display text-3xl">{planned.outfit.name}</h2>
            <Link href={`/outfits/${planned.outfit.id}`} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-fg">
              Open outfit <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-3xl">Outfit of the day</h2>
          <Link href="/planner" className="text-sm text-accent hover:underline">Plan the week</Link>
        </div>
        {!profile?.location && <p className="mb-3 text-sm text-fg-muted">Tip: <Link href="/planner" className="text-accent hover:underline">set your city</Link> so picks match the weather.</p>}
        <TodayPicks items={items} weather={weather} units={profile?.units ?? "imperial"} palette={{ best: profile?.palette?.best ?? [], avoid: profile?.palette?.avoid ?? [] }} tomorrow={tomorrow} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/fit-check", icon: Camera, title: "Fit Check", body: lastCheck?.[0] && !profile?.hide_scores ? `Last score ${lastCheck[0].total_score} — beat it?` : "Rate today's look" },
          { href: "/closet/add", icon: Plus, title: "Add pieces", body: `${items.length} in your closet` },
          { href: "/stylist", icon: MessageCircle, title: "Ask the stylist", body: "Outfits for anything" },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="group flex items-center gap-4 rounded-3xl border border-border p-5 hover:border-accent/40">
            <span className="grid size-12 place-items-center rounded-2xl bg-surface-2"><c.icon className="size-5 text-accent" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{c.title}</span>
              <span className="block truncate text-sm text-fg-muted">{c.body}</span>
            </span>
            <ArrowRight className="size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      {nudges.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 font-display text-3xl"><Sparkles className="size-5 text-accent" /> Wear me again</h2>
          <p className="mt-1 text-sm text-fg-muted">These have been waiting a while. Give one a comeback.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {nudges.map((i) => {
              const d = daysSince(i.last_worn ?? i.created_at.slice(0, 10));
              return (
                <Link key={i.id} href={`/try-on?with=${i.id}`} className="group">
                  <ItemImage src={i.image_url} alt={i.name} tint={i.colors[0]} className="aspect-[3/4] rounded-2xl transition-transform group-hover:-translate-y-0.5" />
                  <p className="mt-2 truncate text-sm">{i.name}</p>
                  <p className="text-xs text-fg-subtle">{i.last_worn ? `${d} days since last worn` : "Never worn"} · Style it →</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

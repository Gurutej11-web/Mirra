import Link from "next/link";
import { Archive, ArrowRight, Download, LogOut, Palette, Sparkles, User } from "lucide-react";
import { getSession } from "@/lib/session";
import { styleLabel } from "@/lib/style";
import { colorName } from "@/lib/colors";
import { Avatar } from "@/components/tryon/avatar";
import { SettingsForm } from "@/components/profile/settings-form";
import { DangerZone } from "@/components/profile/danger-zone";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user, profile, supabase } = await getSession();
  const name = profile?.display_name || user.email?.split("@")[0] || "You";
  const dna = profile?.style_dna;
  const pal = profile?.palette;
  const { count: archived } = await supabase.from("items").select("id", { count: "exact", head: true }).eq("archived", true);

  return (
    <section>
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-full bg-accent font-display text-3xl text-accent-fg">{name.charAt(0).toUpperCase()}</div>
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">{name}</h1>
            <p className="text-sm text-fg-muted">{user.email}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <Button variant="secondary" type="submit"><LogOut className="size-4" /> Sign out</Button>
        </form>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Link href="/onboarding" className="group rounded-3xl border border-border bg-surface/60 p-6 hover:border-accent/40">
          <Sparkles className="size-6 text-accent" />
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-fg-subtle">Style DNA</p>
          <p className="mt-1 font-display text-3xl">{dna?.primary ? styleLabel(dna.primary) : "Take the quiz"}</p>
          {dna?.secondary && <p className="text-sm text-fg-muted">with a {styleLabel(dna.secondary).toLowerCase()} streak</p>}
          {dna?.keywords && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {dna.keywords.slice(0, 4).map((k) => <span key={k} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-muted">{k}</span>)}
            </div>
          )}
          <p className="mt-4 flex items-center gap-1 text-sm text-accent">{dna?.primary ? "Retake quiz" : "Start"} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></p>
        </Link>

        <Link href="/profile/colors" className="group rounded-3xl border border-border bg-surface/60 p-6 hover:border-accent/40">
          <Palette className="size-6 text-accent" />
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-fg-subtle">Color palette</p>
          <p className="mt-1 font-display text-3xl">{pal?.season ?? "Not analyzed"}</p>
          {pal?.undertone && <p className="text-sm capitalize text-fg-muted">{pal.undertone} undertone · {pal.contrast} contrast</p>}
          {pal?.best && (
            <div className="mt-3 flex gap-1">
              {pal.best.map((c) => <span key={c} title={colorName(c)} className="h-6 flex-1 rounded-md" style={{ background: c }} />)}
            </div>
          )}
          <p className="mt-4 flex items-center gap-1 text-sm text-accent">{pal?.season ? "Redo analysis" : "Find my colors"} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></p>
        </Link>

        <Link href="/try-on" className="group flex gap-4 rounded-3xl border border-border bg-surface/60 p-6 hover:border-accent/40">
          <div className="min-w-0 flex-1">
            <User className="size-6 text-accent" />
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-fg-subtle">Avatar</p>
            <p className="mt-1 font-display text-3xl">Your mannequin</p>
            <p className="text-sm text-fg-muted">Customize it in the studio</p>
            <p className="mt-4 flex items-center gap-1 text-sm text-accent">Open studio <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></p>
          </div>
          <Avatar config={profile?.avatar_config} className="h-40 w-auto shrink-0" />
        </Link>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-border p-6">
          <h2 className="text-lg font-medium">Settings</h2>
          {profile ? <SettingsForm profile={profile} /> : <p className="mt-3 text-sm text-fg-muted">Settings appear once the database is set up.</p>}
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-border p-6">
            <h2 className="text-lg font-medium">Your data</h2>
            <p className="mt-1 text-sm text-fg-muted">Everything you add is private to you. Download a copy anytime.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/api/export?format=json" className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm hover:bg-surface"><Download className="size-4" /> Export JSON</a>
              <a href="/api/export?format=csv" className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm hover:bg-surface"><Download className="size-4" /> Closet as CSV</a>
              <Link href="/profile/archive" className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm hover:bg-surface"><Archive className="size-4" /> Archive ({archived ?? 0})</Link>
            </div>
          </div>
          <DangerZone userId={user.id} />
        </div>
      </div>
    </section>
  );
}

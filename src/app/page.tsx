import {
  ArrowRight,
  Camera,
  Link2,
  MessageCircle,
  Palette,
  Shirt,
  ShoppingBag,
  Sparkles,
  CalendarDays,
  BarChart3,
  ScanLine,
  Lock,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { FitScoreCard } from "@/components/landing/fit-score-card";
import { ClosetPreview } from "@/components/landing/closet-preview";
import { Reveal } from "@/components/landing/reveal";

const addWays = [
  {
    icon: Camera,
    title: "Snap the piece",
    body: "Lay it flat or hang it up. Mirra removes the background and tags it for you.",
  },
  {
    icon: ScanLine,
    title: "Snap yourself",
    body: "One mirror selfie, and every piece you're wearing gets detected and cut out.",
  },
  {
    icon: Link2,
    title: "Paste a link",
    body: "Found it online? Drop the product link and we pull the image, brand and price.",
  },
];

const features = [
  {
    icon: Sparkles,
    title: "Try-On studio",
    body: "Mix pieces on your avatar instantly, or see a realistic preview on a photo of you.",
  },
  {
    icon: Palette,
    title: "Your color palette",
    body: "A selfie reveals your undertone and season, and every suggestion uses it.",
  },
  {
    icon: MessageCircle,
    title: "AI stylist chat",
    body: "“What do I wear to a fall wedding?” Three outfits from your own closet.",
  },
  {
    icon: CalendarDays,
    title: "Outfit of the day",
    body: "Weather-aware picks that skip dirty laundry and things you just wore.",
  },
  {
    icon: ShoppingBag,
    title: "Do I need this?",
    body: "See how many new outfits a purchase unlocks, and whether you own a twin already.",
  },
  {
    icon: BarChart3,
    title: "Closet insights",
    body: "Cost per wear, most-worn pieces, and what's quietly collecting dust.",
  },
];

const palette = ["#7b2d3a", "#a2563b", "#c98a4b", "#5b6b4c", "#2f4a3e", "#3a3550"];

export default function Home() {
  return (
    <div className="relative overflow-x-clip">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[640px] w-[900px] -translate-x-1/2 rounded-full bg-accent/15 blur-[140px]"
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <a href="#features" className="hidden px-3 text-sm text-fg-muted hover:text-fg sm:block">
            Features
          </a>
          <a href="#fit-check" className="hidden px-3 text-sm text-fg-muted hover:text-fg sm:block">
            Fit Check
          </a>
          <ButtonLink href="/login" size="sm" variant="secondary">
            Sign in
          </ButtonLink>
          <ButtonLink href="/closet" size="sm">
            Open app
          </ButtonLink>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-12 md:grid-cols-[1.1fr_1fr] md:px-8 md:pt-20">
        <Reveal>
          <Badge>
            <Sparkles className="size-3.5 text-accent" /> Your AI closet & stylist
          </Badge>
          <h1 className="mt-6 font-display text-6xl leading-[0.95] tracking-tight md:text-8xl">
            Every fit, <br />
            <span className="text-gradient italic">reflected</span> better.
          </h1>
          <p className="mt-6 max-w-md text-lg text-fg-muted">
            Put your whole wardrobe in your pocket, try outfits on before you get dressed, and get an
            honest Fit Score with tips that actually help.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/closet" size="lg">
              Build my closet <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="#fit-check" size="lg" variant="secondary">
              See a Fit Check
            </ButtonLink>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-fg-subtle">
            <Lock className="size-3.5" /> Your photos stay private. Always.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="relative">
          <div className="glass relative rounded-[2rem] p-4 md:rotate-2">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-medium">My closet</span>
              <span className="text-xs text-fg-subtle">48 pieces</span>
            </div>
            <ClosetPreview />
          </div>
          <div className="glass absolute -bottom-8 -left-4 hidden items-center gap-3 rounded-2xl px-4 py-3 md:flex md:-rotate-3">
            <span className="font-display text-3xl text-accent">86</span>
            <span className="text-xs leading-tight text-fg-muted">
              Fit Score
              <br />
              Dinner look
            </span>
          </div>
        </Reveal>
      </section>

      {/* Three ways to add */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-20 md:px-8">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Step one</p>
          <h2 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
            Your closet, in three taps.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {addWays.map((w, i) => (
            <Reveal key={w.title} delay={i * 0.08}>
              <Card className="h-full">
                <w.icon className="size-6 text-accent" />
                <h3 className="mt-5 text-lg font-medium">{w.title}</h3>
                <p className="mt-2 text-sm text-fg-muted">{w.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Fit Check showcase */}
      <section
        id="fit-check"
        className="relative z-10 mx-auto grid max-w-6xl scroll-mt-10 items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-8"
      >
        <Reveal className="order-2 flex justify-center md:order-1">
          <FitScoreCard />
        </Reveal>
        <Reveal className="order-1 md:order-2">
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Fit Check</p>
          <h2 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
            An honest second opinion, <span className="italic text-fg-muted">every time.</span>
          </h2>
          <p className="mt-5 text-fg-muted">
            Snap what you&apos;re wearing. Mirra scores color harmony, fit, cohesion, occasion and
            trend, then tells you exactly what to swap, often with something you already own.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-fg-muted">
            <li className="flex gap-2">
              <span className="text-accent">✦</span> Feedback on clothes, colors and fit, never your body
            </li>
            <li className="flex gap-2">
              <span className="text-accent">✦</span> Track your score as your style levels up
            </li>
            <li className="flex gap-2">
              <span className="text-accent">✦</span> Optional Roast Mode for brutally funny reviews
            </li>
          </ul>
        </Reveal>
      </section>

      {/* Color palette */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-20 md:px-8">
        <Reveal>
          <Card className="grain relative overflow-hidden p-8 md:p-12">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-accent">Color analysis</p>
                <h2 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
                  Find the colors that light you up.
                </h2>
                <p className="mt-4 text-fg-muted">
                  One natural-light selfie, analyzed right on your device, reveals your undertone and
                  seasonal palette.
                </p>
              </div>
              <div>
                <p className="text-sm text-fg-muted">
                  Example: <span className="text-fg">Deep Autumn</span> · warm undertone
                </p>
                <div className="mt-4 flex gap-2">
                  {palette.map((c) => (
                    <span
                      key={c}
                      className="h-24 flex-1 rounded-2xl border border-white/10"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Reveal>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl scroll-mt-10 px-4 py-20 md:px-8">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Everything else</p>
          <h2 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
            A stylist that knows your closet.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <Card className="h-full transition-colors hover:border-accent/40">
                <div className="grid size-11 place-items-center rounded-xl bg-surface-2">
                  <f.icon className="size-5 text-accent" />
                </div>
                <h3 className="mt-5 text-lg font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-fg-muted">{f.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-24 text-center md:px-8">
        <Reveal>
          <Shirt className="mx-auto size-8 text-accent" />
          <h2 className="mx-auto mt-5 max-w-2xl font-display text-5xl tracking-tight md:text-6xl">
            Stop staring at your closet. <span className="text-gradient italic">Start styling it.</span>
          </h2>
          <div className="mt-9 flex justify-center">
            <ButtonLink href="/closet" size="lg">
              Get started free <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-fg-subtle md:flex-row md:px-8">
          <Logo />
          <p>© {new Date().getFullYear()} Mirra. Built by Gurutej Bandla.</p>
        </div>
      </footer>
    </div>
  );
}

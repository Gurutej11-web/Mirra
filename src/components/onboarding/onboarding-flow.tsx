"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Heart, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BUDGETS,
  FIT_OPTIONS,
  OCCASIONS,
  QUIZ_CARDS,
  STYLES,
  SWATCHES,
  computeStyleDNA,
  type QuizCard,
} from "@/lib/style";
import { saveOnboarding } from "@/app/onboarding/actions";
import type { StyleDNA } from "@/lib/types";

const STEPS = ["About you", "Style quiz", "Fit", "Colors", "Lifestyle", "Your DNA"] as const;

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-2 text-sm capitalize transition-colors",
        active
          ? "border-accent bg-accent/15 text-fg"
          : "border-border text-fg-muted hover:border-fg-subtle hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function SwipeCard({ card, onDecide }: { card: QuizCard; onDecide: (like: boolean) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -20], [1, 0]);

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.x > 110) onDecide(true);
        else if (info.offset.x < -110) onDecide(false);
      }}
      initial={{ scale: 0.95, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border bg-surface">
        <div className="flex flex-1">
          {card.colors.map((c) => (
            <div key={c} className="flex-1" style={{ background: c }} />
          ))}
        </div>
        <div className="space-y-2 p-6">
          <h3 className="font-display text-3xl">{card.title}</h3>
          <ul className="space-y-1 text-sm text-fg-muted">
            {card.pieces.map((p) => (
              <li key={p}>· {p}</li>
            ))}
          </ul>
        </div>
        <motion.span
          style={{ opacity: likeOpacity }}
          className="absolute left-6 top-6 rotate-[-10deg] rounded-lg border-2 border-success px-3 py-1 text-lg font-bold text-success"
        >
          LOVE
        </motion.span>
        <motion.span
          style={{ opacity: nopeOpacity }}
          className="absolute right-6 top-6 rotate-[10deg] rounded-lg border-2 border-danger px-3 py-1 text-lg font-bold text-danger"
        >
          NOPE
        </motion.span>
      </div>
    </motion.div>
  );
}

export function OnboardingFlow({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [build, setBuild] = useState<string | null>(null);
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [tops, setTops] = useState("regular");
  const [bottoms, setBottoms] = useState("regular");
  const [favorite, setFavorite] = useState<string[]>([]);
  const [banned, setBanned] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [budget, setBudget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [dna, setDna] = useState<StyleDNA | null>(null);

  const decide = useCallback(
    (like: boolean) => {
      const card = QUIZ_CARDS[cardIndex];
      if (!card) return;
      (like ? setLiked : setDisliked)((prev) => [...prev, card.id]);
      setCardIndex((i) => i + 1);
    },
    [cardIndex],
  );

  const quizDone = cardIndex >= QUIZ_CARDS.length;

  // Arrow keys for the quiz
  useEffect(() => {
    if (step !== 1 || quizDone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") decide(true);
      if (e.key === "ArrowLeft") decide(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, quizDone, decide]);

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function heightCm() {
    const ft = Number(heightFt);
    const inch = Number(heightIn || 0);
    if (!ft) return null;
    const cm = Math.round((ft * 12 + inch) * 2.54);
    return cm >= 90 && cm <= 250 ? cm : null;
  }

  function next() {
    setError(null);
    if (step === 1 && !quizDone) {
      setError("Swipe through all the looks first — it only takes a minute.");
      return;
    }
    if (step === 4) {
      setDna(computeStyleDNA(liked, disliked, occasions));
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function finish() {
    startSaving(async () => {
      const res = await saveOnboarding({
        displayName: name.trim() || undefined,
        liked,
        disliked,
        occasions,
        tops,
        bottoms,
        heightCm: heightCm(),
        build,
        favoriteColors: favorite,
        bannedColors: banned,
        budget,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.replace("/closet?welcome=1");
      router.refresh();
    });
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-accent";

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* progress */}
      <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-accent" : "bg-surface-2")}
          />
        ))}
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-fg-subtle">
        {step + 1} / {STEPS.length} · {STEPS[step]}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="mt-6"
        >
          {step === 0 && (
            <div className="space-y-6">
              <h1 className="font-display text-5xl tracking-tight">Let&apos;s get to know you.</h1>
              <label className="block space-y-2">
                <span className="text-sm text-fg-muted">What should we call you?</span>
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
              </label>
              <div className="space-y-2">
                <span className="text-sm text-fg-muted">Height (optional — helps with proportion tips)</span>
                <div className="flex gap-3">
                  <input className={inputClass} inputMode="numeric" placeholder="ft" value={heightFt} onChange={(e) => setHeightFt(e.target.value.replace(/\D/g, "").slice(0, 1))} />
                  <input className={inputClass} inputMode="numeric" placeholder="in" value={heightIn} onChange={(e) => setHeightIn(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-fg-muted">Build (optional)</span>
                <div className="flex flex-wrap gap-2">
                  {["slim", "athletic", "average", "broad", "curvy"].map((b) => (
                    <Chip key={b} active={build === b} onClick={() => setBuild(build === b ? null : b)}>
                      {b}
                    </Chip>
                  ))}
                </div>
                <p className="text-xs text-fg-subtle">Only used to suggest silhouettes. Mirra never comments on your body.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="font-display text-5xl tracking-tight">Love it or leave it?</h1>
              <p className="mt-2 text-sm text-fg-muted">Drag right to love, left to pass — or use the buttons / arrow keys.</p>
              <div className="relative mx-auto mt-6 h-[420px] max-w-sm">
                <AnimatePresence>
                  {!quizDone && (
                    <SwipeCard key={QUIZ_CARDS[cardIndex].id} card={QUIZ_CARDS[cardIndex]} onDecide={decide} />
                  )}
                </AnimatePresence>
                {quizDone && (
                  <div className="grid h-full place-items-center rounded-[2rem] border border-dashed border-border text-center">
                    <div>
                      <Check className="mx-auto size-10 text-success" />
                      <p className="mt-3 font-display text-3xl">All done!</p>
                      <p className="text-sm text-fg-muted">You loved {liked.length} looks.</p>
                      <button
                        className="mt-3 text-sm text-accent hover:underline"
                        onClick={() => {
                          setLiked([]);
                          setDisliked([]);
                          setCardIndex(0);
                        }}
                      >
                        Redo the quiz
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {!quizDone && (
                <div className="mt-6 flex items-center justify-center gap-6">
                  <button
                    onClick={() => decide(false)}
                    aria-label="Pass"
                    className="grid size-14 place-items-center rounded-full border border-border text-danger hover:bg-danger/10"
                  >
                    <X className="size-6" />
                  </button>
                  <span className="text-xs tabular-nums text-fg-subtle">
                    {cardIndex + 1} / {QUIZ_CARDS.length}
                  </span>
                  <button
                    onClick={() => decide(true)}
                    aria-label="Love"
                    className="grid size-14 place-items-center rounded-full border border-border text-success hover:bg-success/10"
                  >
                    <Heart className="size-6" />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <h1 className="font-display text-5xl tracking-tight">How do you like things to fit?</h1>
              {[
                { label: "Tops", value: tops, set: setTops },
                { label: "Bottoms", value: bottoms, set: setBottoms },
              ].map((row) => (
                <div key={row.label} className="space-y-3">
                  <span className="text-sm text-fg-muted">{row.label}</span>
                  <div className="flex flex-wrap gap-2">
                    {FIT_OPTIONS.map((f) => (
                      <Chip key={f} active={row.value === f} onClick={() => row.set(f)}>
                        {f}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <h1 className="font-display text-5xl tracking-tight">Colors you love — and don&apos;t.</h1>
              {[
                { label: "Favorites", list: favorite, set: setFavorite, other: banned, ring: "ring-success" },
                { label: "Never for me", list: banned, set: setBanned, other: favorite, ring: "ring-danger" },
              ].map((row) => (
                <div key={row.label} className="space-y-3">
                  <span className="text-sm text-fg-muted">{row.label}</span>
                  <div className="grid grid-cols-8 gap-2">
                    {SWATCHES.map((s) => {
                      const on = row.list.includes(s.hex);
                      return (
                        <button
                          key={s.hex}
                          type="button"
                          title={s.name}
                          aria-label={s.name}
                          aria-pressed={on}
                          disabled={row.other.includes(s.hex)}
                          onClick={() => toggle(row.list, row.set, s.hex)}
                          className={cn(
                            "aspect-square rounded-full border border-white/10 transition disabled:opacity-20",
                            on && `ring-2 ring-offset-2 ring-offset-bg ${row.ring}`,
                          )}
                          style={{ background: s.hex }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-xs text-fg-subtle">Tip: after this, the color analysis selfie finds the shades that flatter you most.</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8">
              <h1 className="font-display text-5xl tracking-tight">What do you dress for?</h1>
              <div className="space-y-3">
                <span className="text-sm text-fg-muted">Pick all that apply</span>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((o) => (
                    <Chip key={o} active={occasions.includes(o)} onClick={() => toggle(occasions, setOccasions, o)}>
                      {o}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <span className="text-sm text-fg-muted">Usual budget</span>
                <div className="flex flex-wrap gap-2">
                  {BUDGETS.map((b) => (
                    <Chip key={b} active={budget === b} onClick={() => setBudget(budget === b ? null : b)}>
                      {b}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && dna && (
            <div className="glass grain relative overflow-hidden rounded-[2rem] p-8">
              <Sparkles className="size-6 text-accent" />
              <p className="mt-4 text-xs uppercase tracking-[0.25em] text-fg-subtle">Your Style DNA</p>
              <h1 className="mt-2 font-display text-5xl tracking-tight">
                <span className="text-gradient italic">{STYLES[dna.primary as keyof typeof STYLES]?.label}</span>
              </h1>
              <p className="mt-1 text-fg-muted">
                with a {STYLES[dna.secondary as keyof typeof STYLES]?.label.toLowerCase()} streak
              </p>
              <p className="mt-5 text-sm text-fg-muted">{dna.summary}</p>
              <div className="mt-6 space-y-2">
                {Object.entries(dna.scores ?? {})
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between text-xs text-fg-muted">
                        <span>{STYLES[k as keyof typeof STYLES]?.label}</span>
                        <span>{v}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {dna.keywords?.map((k) => (
                  <span key={k} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-fg-muted">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Start my closet
          </Button>
        )}
      </div>
    </div>
  );
}

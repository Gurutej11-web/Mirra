"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

const breakdown = [
  { label: "Color harmony", value: 92 },
  { label: "Fit & proportion", value: 84 },
  { label: "Style cohesion", value: 88 },
  { label: "Occasion match", value: 79 },
  { label: "Trend factor", value: 81 },
];

const SCORE = 86;
const R = 52;
const C = 2 * Math.PI * R;

/** Demo Fit Score card used on the landing page. */
export function FitScoreCard() {
  return (
    <div className="glass w-full max-w-sm rounded-[2rem] p-6 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle">Fit Score</p>
          <p className="mt-1 text-sm text-fg-muted">Dinner · Smart casual</p>
        </div>
        <div className="relative size-28">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
            <motion.circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke="url(#mirra-score)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              whileInView={{ strokeDashoffset: C * (1 - SCORE / 100) }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
            <defs>
              <linearGradient id="mirra-score" x1="0" x2="1">
                <stop offset="0" stopColor="var(--accent-2)" />
                <stop offset="1" stopColor="var(--accent)" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 grid place-items-center font-display text-4xl">{SCORE}</span>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {breakdown.map((b, i) => (
          <li key={b.label}>
            <div className="flex justify-between text-xs text-fg-muted">
              <span>{b.label}</span>
              <span className="tabular-nums text-fg">{b.value}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: 0 }}
                whileInView={{ width: `${b.value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex gap-3 rounded-2xl bg-surface-2/80 p-4 text-sm">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
        <p className="text-fg-muted">
          A <span className="text-fg">deep burgundy</span> knit would flatter your warm undertone more than
          gray. Try your brown Chelsea boots instead of white sneakers.
        </p>
      </div>
    </div>
  );
}

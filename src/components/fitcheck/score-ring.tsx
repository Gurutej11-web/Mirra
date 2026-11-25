"use client";

import { motion } from "motion/react";

export function scoreLabel(s: number) {
  if (s >= 90) return "Exceptional";
  if (s >= 80) return "Great fit";
  if (s >= 70) return "Solid";
  if (s >= 55) return "Getting there";
  return "Needs work";
}

export function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="9" />
        <motion.circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - score / 100) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" x2="1">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <motion.p
            className="font-display leading-none"
            style={{ fontSize: size * 0.32 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {score}
          </motion.p>
          <p className="mt-1 text-[11px] text-fg-subtle">{scoreLabel(score)}</p>
        </div>
      </div>
    </div>
  );
}

export function BreakdownBars({ breakdown }: { breakdown: Record<string, number> }) {
  return (
    <ul className="space-y-3">
      {Object.entries(breakdown).map(([k, v], i) => (
        <li key={k}>
          <div className="flex justify-between text-xs text-fg-muted">
            <span className="capitalize">{k.replace(/_/g, " ").replace("fit proportion", "fit & proportion")}</span>
            <span className="tabular-nums text-fg">{v}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${v}%` }}
              transition={{ duration: 1, delay: 0.2 + i * 0.08 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

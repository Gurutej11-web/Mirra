"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ScoreTrend({ data }: { data: { date: string; score: number }[] }) {
  const rows = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="trend" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis domain={[0, 100]} tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--fg)" }}
            labelStyle={{ color: "var(--fg-muted)" }}
            formatter={(v) => [v as number, "Score"]}
          />
          <Area type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2.5} fill="url(#trend)" dot={{ r: 3, fill: "var(--accent)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltip = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--fg)" },
  labelStyle: { color: "var(--fg-muted)" },
  itemStyle: { color: "var(--fg)" },
};
const axis = { tick: { fill: "var(--fg-subtle)", fontSize: 11 }, axisLine: false, tickLine: false } as const;
const mon = (m: string) => new Date(m + "-01T00:00:00").toLocaleDateString(undefined, { month: "short" });

export function ColorDonut({ data }: { data: { name: string; color: string; value: number }[] }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="95%" paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip {...tooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {data
          .slice()
          .sort((a, b) => b.value - a.value)
          .map((d) => (
            <li key={d.name} className="flex items-center gap-1.5 capitalize text-fg-muted">
              <span className="size-2.5 rounded-full border border-white/20" style={{ background: d.color }} /> {d.name}
              <span className="ml-auto text-fg-subtle">{d.value}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

export function CategoryBars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="mt-2 h-52">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={96} {...axis} />
          <Tooltip {...tooltip} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="value" name="Pieces" fill="var(--accent)" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyWears({ data }: { data: { month: string; wears: number }[] }) {
  return (
    <div className="mt-2 h-52">
      <ResponsiveContainer>
        <BarChart data={data.map((d) => ({ ...d, label: mon(d.month) }))} margin={{ left: -24, right: 4 }}>
          <XAxis dataKey="label" {...axis} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip {...tooltip} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="wears" name="Outfits logged" fill="var(--accent)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendChart({ data, budget }: { data: { month: string; spent: number }[]; budget: number | null }) {
  return (
    <div className="mt-2 h-44">
      <ResponsiveContainer>
        <BarChart data={data.map((d) => ({ ...d, label: mon(d.month) }))} margin={{ left: -16, right: 4 }}>
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} />
          <Tooltip {...tooltip} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => [`$${v}`, "Spent"]} />
          {budget != null && <ReferenceLine y={budget} stroke="var(--warning)" strokeDasharray="4 4" />}
          <Bar dataKey="spent" fill="var(--accent-2)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

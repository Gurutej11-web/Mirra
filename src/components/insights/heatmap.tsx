/** GitHub-style calendar of days you logged an outfit (last 53 weeks). */
export function WearHeatmap({ dates, today }: { dates: string[]; today: string }) {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(d, (counts.get(d) ?? 0) + 1);

  const end = new Date(today + "T00:00:00");
  const start = new Date(end);
  start.setDate(start.getDate() - 7 * 52 - end.getDay());
  const weeks: { iso: string; n: number; future: boolean }[][] = [];
  const cur = new Date(start);
  while (cur <= end || weeks.length < 53) {
    const week: { iso: string; n: number; future: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      week.push({ iso, n: counts.get(iso) ?? 0, future: cur > end });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
    if (weeks.length >= 53) break;
  }
  const active = [...counts.keys()].filter((d) => d >= weeks[0][0].iso).length;

  return (
    <div className="mt-4">
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]" role="img" aria-label={`${active} days with an outfit logged in the last year`}>
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {w.map((d) => (
                <span
                  key={d.iso}
                  title={d.future ? "" : `${d.iso}: ${d.n ? `${d.n} outfit${d.n > 1 ? "s" : ""}` : "nothing logged"}`}
                  className="size-[11px] rounded-[3px]"
                  style={{
                    background: d.future
                      ? "transparent"
                      : d.n === 0
                        ? "var(--surface-2)"
                        : `color-mix(in oklab, var(--accent) ${Math.min(100, 45 + d.n * 25)}%, var(--surface-2))`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-fg-subtle">{active} days logged</p>
    </div>
  );
}

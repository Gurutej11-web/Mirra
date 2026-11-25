/** Stylised closet grid for the landing hero — abstract garments, no stock photos. */
const items = [
  { name: "Oxford shirt", color: "#dfe6ef", shape: "top" },
  { name: "Wide trousers", color: "#3b3f4a", shape: "bottom" },
  { name: "Overshirt", color: "#5b6b4c", shape: "top" },
  { name: "Chelsea boots", color: "#6b4430", shape: "shoe" },
  { name: "Knit sweater", color: "#7b2d3a", shape: "top" },
  { name: "Denim", color: "#41597a", shape: "bottom" },
] as const;

function Garment({ shape, color }: { shape: "top" | "bottom" | "shoe"; color: string }) {
  if (shape === "top")
    return (
      <svg viewBox="0 0 64 64" className="size-16" aria-hidden>
        <path
          d="M22 8 12 13 4 26l9 5 4-6v31h30V25l4 6 9-5-8-13-10-5c-1 4-5 7-10 7s-9-3-10-7Z"
          fill={color}
        />
      </svg>
    );
  if (shape === "bottom")
    return (
      <svg viewBox="0 0 64 64" className="size-16" aria-hidden>
        <path d="M18 6h28l4 52H37l-5-34-5 34H14Z" fill={color} />
      </svg>
    );
  return (
    <svg viewBox="0 0 64 64" className="size-16" aria-hidden>
      <path d="M14 14h14v22c6 0 22 2 24 10v6H12Z" fill={color} />
    </svg>
  );
}

export function ClosetPreview() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((it) => (
        <div
          key={it.name}
          className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface/80"
        >
          <Garment shape={it.shape} color={it.color} />
          <span className="text-[11px] text-fg-subtle">{it.name}</span>
        </div>
      ))}
    </div>
  );
}

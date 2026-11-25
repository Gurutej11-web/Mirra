import type { LucideIcon } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";

/** Placeholder for app sections that land in later build phases. */
export function ComingSoon({
  icon: Icon,
  title,
  description,
  phase,
  bullets,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: number;
  bullets: string[];
}) {
  return (
    <section>
      <Badge>Arrives in phase {phase}</Badge>
      <h1 className="mt-4 font-display text-5xl tracking-tight md:text-6xl">{title}</h1>
      <p className="mt-3 max-w-xl text-fg-muted">{description}</p>

      <Card className="mt-10 flex flex-col gap-6 md:flex-row md:items-center">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-surface-2 text-accent">
          <Icon className="size-7" />
        </div>
        <ul className="grid flex-1 gap-2 text-sm text-fg-muted sm:grid-cols-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
              {b}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

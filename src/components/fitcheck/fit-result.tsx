"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, Heart, MessageCircle, Palette, Repeat, Ruler, Scale, Shirt, Sparkles, Trash2, TrendingDown, TrendingUp, Watch } from "lucide-react";
import { BreakdownBars, ScoreRing } from "@/components/fitcheck/score-ring";
import { ItemImage } from "@/components/closet/item-image";
import { ShareCardButton } from "@/components/share/share-card-button";
import { CaptionGenerator } from "@/components/fitcheck/caption-generator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteFitCheck } from "@/app/(app)/fit-check/actions";
import { colorName } from "@/lib/colors";
import type { FitCheck } from "@/lib/types";

const KIND_ICON = { color: Palette, fit: Ruler, swap: Repeat, styling: Sparkles, accessory: Watch } as const;
const MODE_ICON = { honest: Scale, hype: Heart, roast: Flame } as const;

export function FitResult({
  check,
  photoUrl,
  items,
  previousScore,
  hideScores,
}: {
  check: FitCheck;
  photoUrl: string | null;
  items: { id: string; name: string; image_url: string | null; color: string | null }[];
  previousScore: number | null;
  hideScores: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const score = check.total_score ?? 0;
  const delta = previousScore != null ? score - previousScore : null;
  const ModeIcon = MODE_ICON[check.mode];
  const byId = new Map(items.map((i) => [i.id, i]));

  const stylistPrompt = encodeURIComponent(
    `My last Fit Check scored ${score}${check.occasion ? ` for ${check.occasion}` : ""}. Tips were: ${check.tips.map((t) => t.title).join("; ")}. Build me an improved outfit from my closet.`,
  );

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl ?? ""} alt="Your outfit" className="aspect-[3/4] w-full rounded-[2rem] border border-border bg-surface object-cover" />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-subtle">
          <ModeIcon className="size-3.5" /> {check.mode} mode · {check.occasion ?? "everyday"} ·{" "}
          {new Date(check.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {!hideScores && <ScoreRing score={score} />}
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">{check.headline}</h1>
            {!hideScores && delta != null && delta !== 0 && (
              <p className={`mt-2 flex items-center gap-1.5 text-sm ${delta > 0 ? "text-success" : "text-fg-muted"}`}>
                {delta > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                {delta > 0 ? "+" : ""}
                {delta} vs your last check
              </p>
            )}
          </div>
        </div>

        {check.verdict && <p className="mt-6 text-lg leading-relaxed text-fg-muted">{check.verdict}</p>}

        {!hideScores && (
          <div className="mt-8 rounded-3xl bg-surface/60 p-5">
            <BreakdownBars breakdown={check.breakdown} />
          </div>
        )}

        <h2 className="mt-10 text-lg font-medium">How to level it up</h2>
        <ol className="mt-4 space-y-3">
          {check.tips.map((t, i) => {
            const Icon = KIND_ICON[t.kind] ?? Sparkles;
            const it = t.item_id ? byId.get(t.item_id) : null;
            return (
              <li key={i} className="flex gap-4 rounded-2xl border border-border p-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2">
                  <Icon className="size-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.title}</p>
                  <p className="mt-1 text-sm text-fg-muted">{t.detail}</p>
                  {t.color && (
                    <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-surface px-2.5 py-1 text-xs capitalize">
                      <span className="size-3.5 rounded-full border border-white/20" style={{ background: t.color }} /> {colorName(t.color)}
                    </span>
                  )}
                </div>
                {it && (
                  <Link href={`/closet/${it.id}`} className="w-16 shrink-0" title={it.name}>
                    <ItemImage src={it.image_url} alt={it.name} tint={it.color ?? undefined} className="aspect-[3/4] rounded-xl" />
                  </Link>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link href={`/stylist?q=${stylistPrompt}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-fg hover:bg-accent-2">
            <MessageCircle className="size-4" /> Fix it with the stylist
          </Link>
          <ShareCardButton
            title={check.headline ?? "My Fit Check"}
            subtitle={check.occasion ?? "Rated by Mirra"}
            score={hideScores ? null : score}
            photo={photoUrl}
            breakdown={
              hideScores
                ? undefined
                : Object.entries(check.breakdown).map(([k, v]) => ({ label: k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()), value: v }))
            }
            tip={check.verdict}
          />
          <Link href="/closet/add" className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm hover:bg-surface">
            <Shirt className="size-4" /> Add these pieces to closet
          </Link>
        </div>

        <CaptionGenerator fitCheckId={check.id} />

        <div className="mt-12 border-t border-border pt-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this Fit Check and its photo permanently?")) return;
              start(async () => {
                const r = await deleteFitCheck(check.id);
                if ("error" in r && r.error) toast(r.error, { tone: "error" });
                else router.push("/fit-check");
              });
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

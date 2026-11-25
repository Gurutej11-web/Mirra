"use client";

import { useState } from "react";
import { Copy, Loader2, MessageSquareQuote } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { postJSON } from "@/lib/upload";
import { cn } from "@/lib/utils";

const VIBES = ["chill", "funny", "confident", "minimal"] as const;

export function CaptionGenerator({ fitCheckId }: { fitCheckId: string }) {
  const toast = useToast();
  const [vibe, setVibe] = useState<(typeof VIBES)[number]>("chill");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ captions: string[]; hashtags: string[] } | null>(null);

  async function run() {
    setBusy(true);
    try {
      setRes(await postJSON("/api/tools/caption", { fitCheckId, vibe }));
    } catch (e) {
      toast((e as Error).message, { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied");
    } catch {
      toast("Couldn't copy — select the text instead.", { tone: "error" });
    }
  }

  return (
    <div className="mt-10 rounded-3xl border border-border p-5">
      <p className="flex items-center gap-2 font-medium"><MessageSquareQuote className="size-4 text-accent" /> Caption it</p>
      <p className="text-xs text-fg-subtle">Posting this fit? Get a caption that doesn&apos;t sound like a robot.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {VIBES.map((v) => (
          <button key={v} onClick={() => setVibe(v)} className={cn("rounded-full border px-3 py-1 text-xs capitalize", vibe === v ? "border-accent bg-accent/15" : "border-border text-fg-muted")}>
            {v}
          </button>
        ))}
        <button onClick={run} disabled={busy} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm hover:bg-border">
          {busy && <Loader2 className="size-3.5 animate-spin" />} {res ? "Regenerate" : "Write captions"}
        </button>
      </div>
      {res && (
        <div className="mt-4 space-y-2">
          {res.captions.map((c) => (
            <button key={c} onClick={() => copy(c)} className="flex w-full items-start gap-3 rounded-xl bg-surface p-3 text-left text-sm hover:bg-surface-2">
              <span className="flex-1">{c}</span>
              <Copy className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" />
            </button>
          ))}
          {res.hashtags.length > 0 && (
            <button onClick={() => copy(res.hashtags.map((h) => `#${h}`).join(" "))} className="flex w-full items-start gap-3 rounded-xl p-3 text-left text-sm text-accent hover:bg-surface">
              <span className="flex-1">{res.hashtags.map((h) => `#${h}`).join(" ")}</span>
              <Copy className="mt-0.5 size-3.5 shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

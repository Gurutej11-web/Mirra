"use client";

import { useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { renderShareCard, shareOrDownload, type CardInput } from "@/lib/share-card";

export function ShareCardButton(props: CardInput & { label?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const blob = await renderShareCard(props);
      const res = await shareOrDownload(blob, "mirra-fit-card.png", `${props.title} — styled with Mirra`);
      if (res === "downloaded") toast("Fit Card downloaded — post it to your story");
    } catch (e) {
      toast((e as Error).message || "Couldn't create the card", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={go}
      disabled={busy}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm hover:bg-surface disabled:opacity-50"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />} {props.label ?? "Fit Card"}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Bookmark, Loader2, Mic, MicOff, Sparkles, Trash2 } from "lucide-react";
import { ItemImage } from "@/components/closet/item-image";
import { useToast } from "@/components/ui/toast";
import { saveOutfit } from "@/app/(app)/outfits/actions";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

type MiniItem = { id: string; name: string; image_url: string | null; color: string | null };

const PROMPTS = [
  "What should I wear today?",
  "Build me a date night outfit",
  "I have a job interview — help",
  "What goes with my most-worn piece?",
  "Make a 5-day capsule for a trip",
  "Which pieces am I not using enough?",
];

function Formatted({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*[-•*]\s/.test(l)))
          return (
            <ul key={i} className="space-y-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                  <span>{l.replace(/^\s*[-•*]\s/, "")}</span>
                </li>
              ))}
            </ul>
          );
        return (
          <p key={i} className="whitespace-pre-line">
            {b.replace(/\*\*(.+?)\*\*/g, "$1")}
          </p>
        );
      })}
    </div>
  );
}

// Minimal Web Speech API typing
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

export function StylistChat({
  initial,
  items,
  firstName,
  prefill,
}: {
  initial: ChatMessage[];
  items: MiniItem[];
  firstName: string;
  prefill?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState(prefill ?? "");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [saving, startSaving] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const byId = new Map(items.map((i) => [i.id, i]));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(msg?: string) {
    const content = (msg ?? text).trim();
    if (!content || sending) return;
    setText("");
    setSending(true);
    const optimistic: ChatMessage = { id: `tmp-${Date.now()}`, role: "user", content, attached_outfits: [], created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await fetch("/api/stylist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "The stylist is unavailable right now.");
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), ...(json.messages as ChatMessage[])]);
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setText(content);
      toast((e as Error).message, { tone: "error" });
    } finally {
      setSending(false);
    }
  }

  async function clear() {
    if (!confirm("Clear the whole conversation?")) return;
    const res = await fetch("/api/stylist", { method: "DELETE" });
    if (res.ok) {
      setMessages([]);
      router.refresh();
    } else toast("Couldn't clear the chat.", { tone: "error" });
  }

  function toggleVoice() {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return toast("Voice input isn't supported in this browser.", { tone: "info" });
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.onresult = (e) => {
      const t = Array.from(e.results).map((r) => r[0].transcript).join("");
      setText(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function save(o: { name: string; item_ids: string[] }) {
    startSaving(async () => {
      const r = await saveOutfit({ name: o.name.slice(0, 60), item_ids: o.item_ids, layout: {}, occasion: null, lookbook_id: null });
      if ("error" in r && r.error) toast(r.error, { tone: "error" });
      else toast("Saved to Outfits", { action: { label: "View", onClick: () => router.push(`/outfits/${(r as { id: string }).id}`) } });
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col">
      <div className="flex-1 space-y-6 pb-6">
        {messages.length === 0 && (
          <div className="py-10 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-accent/15">
              <Sparkles className="size-7 text-accent" />
            </div>
            <h2 className="mt-5 font-display text-4xl">Hey {firstName}, what are we dressing for?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
              I know every piece in your closet, your colors, your style and today&apos;s weather.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[92%] sm:max-w-[80%]", m.role === "user" && "rounded-3xl rounded-br-lg bg-accent px-4 py-3 text-accent-fg")}>
              {m.role === "assistant" ? (
                <div className="flex gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-surface-2">
                    <Sparkles className="size-4 text-accent" />
                  </span>
                  <div className="min-w-0 space-y-4 text-[15px] leading-relaxed">
                    <Formatted text={m.content} />
                    {m.attached_outfits?.map((o, i) => (
                      <div key={i} className="rounded-3xl border border-border bg-surface/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{o.name}</p>
                            {o.why && <p className="mt-0.5 text-sm text-fg-muted">{o.why}</p>}
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                          {o.item_ids.map((id) => {
                            const it = byId.get(id);
                            if (!it) return null;
                            return (
                              <Link key={id} href={`/closet/${id}`} className="w-20 shrink-0" title={it.name}>
                                <ItemImage src={it.image_url} alt={it.name} tint={it.color ?? undefined} className="aspect-[3/4] rounded-xl" />
                                <p className="mt-1 truncate text-[11px] text-fg-subtle">{it.name}</p>
                              </Link>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Link href={`/try-on?items=${o.item_ids.join(",")}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-xs hover:bg-border">
                            <Sparkles className="size-3.5" /> Try it on
                          </Link>
                          <button onClick={() => save(o)} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-xs hover:bg-surface">
                            <Bookmark className="size-3.5" /> Save
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-line text-[15px]">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-surface-2">
              <Sparkles className="size-4 animate-pulse text-accent" />
            </span>
            <div className="flex items-center gap-1 rounded-full bg-surface px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-fg-subtle" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-24 z-10 md:bottom-4">
        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {PROMPTS.map((p) => (
              <button key={p} onClick={() => send(p)} className="rounded-full border border-border bg-bg/80 px-3 py-1.5 text-sm text-fg-muted backdrop-blur hover:text-fg">
                {p}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="glass flex items-end gap-2 rounded-3xl p-2"
        >
          <button type="button" onClick={toggleVoice} aria-label={listening ? "Stop voice input" : "Voice input"} className={cn("grid size-10 shrink-0 place-items-center rounded-full", listening ? "bg-danger/20 text-danger" : "text-fg-subtle hover:text-fg")}>
            {listening ? <MicOff className="size-4.5" /> : <Mic className="size-4.5" />}
          </button>
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={listening ? "Listening…" : "Ask your stylist anything…"}
            maxLength={1500}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] outline-none placeholder:text-fg-subtle"
          />
          <button type="submit" disabled={!text.trim() || sending} aria-label="Send" className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-fg disabled:opacity-40">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4.5" />}
          </button>
        </form>
        {messages.length > 0 && (
          <button onClick={clear} className="mx-auto mt-2 flex items-center gap-1 text-xs text-fg-subtle hover:text-fg">
            <Trash2 className="size-3" /> Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, Flame, Heart, Loader2, Scale, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage, photoQuality } from "@/lib/image";
import { postForm } from "@/lib/upload";
import { OCCASIONS } from "@/lib/style";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "honest", label: "Honest", icon: Scale, hint: "Balanced, professional feedback" },
  { id: "hype", label: "Hype", icon: Heart, hint: "All the confidence, same truth" },
  { id: "roast", label: "Roast", icon: Flame, hint: "Brutally funny — about the clothes only" },
] as const;

const LOADING = ["Checking the color story…", "Measuring proportions…", "Consulting your palette…", "Raiding your closet for swaps…", "Writing the verdict…"];

async function collage(urls: string[]) {
  const imgs = await Promise.all(
    urls.slice(0, 6).map(
      (src) =>
        new Promise<HTMLImageElement | null>((res) => {
          const i = new Image();
          i.crossOrigin = "anonymous";
          i.onload = () => res(i);
          i.onerror = () => res(null);
          i.src = src;
        }),
    ),
  );
  const list = imgs.filter((x): x is HTMLImageElement => !!x);
  const W = 900, H = 1200;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f4f1ec";
  ctx.fillRect(0, 0, W, H);
  const cols = list.length <= 2 ? 1 : 2;
  const rows = Math.ceil(list.length / cols) || 1;
  const cw = W / cols, ch = H / rows;
  list.forEach((img, i) => {
    const s = Math.min((cw - 60) / img.naturalWidth, (ch - 60) / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (i % cols) * cw + (cw - w) / 2, Math.floor(i / cols) * ch + (ch - h) / 2, w, h);
  });
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("collage failed"))), "image/jpeg", 0.9));
}

export function FitCapture({
  defaultMode,
  outfit,
}: {
  defaultMode: "honest" | "hype" | "roast";
  outfit: { name: string; occasion: string | null; images: string[] } | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>(defaultMode);
  const [occasion, setOccasion] = useState(outfit?.occasion ?? "");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file?: File) {
    if (!file) return;
    setError(null);
    setWarning(null);
    try {
      const blob = await compressImage(file, { max: 1400 });
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
      const q = await photoQuality(blob);
      if (q.tooDark) setWarning("This photo is pretty dark — scores are more accurate in good light.");
      else if (q.blurry) setWarning("This looks a little blurry — a sharper photo gets better feedback.");
      else if (q.tooBright) setWarning("This photo looks overexposed — colors may read wrong.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submit() {
    setError(null);
    setBusy(true);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, LOADING.length - 1)), 1800);
    try {
      const img = outfit && !photo ? await collage(outfit.images) : photo;
      if (!img) throw new Error("Add a photo first.");
      const form = new FormData();
      form.append("image", img, "fit.jpg");
      form.append("mode", mode);
      form.append("occasion", occasion);
      if (outfit && !photo) form.append("virtual", "1");
      const res = await postForm<{ id: string }>("/api/fit-check", form);
      router.push(`/fit-check/${res.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    } finally {
      clearInterval(timer);
    }
  }

  const ready = !!photo || !!outfit;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div>
        <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] border border-border bg-surface">
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Your outfit" className="h-full w-full object-cover" />
              {!busy && (
                <button aria-label="Remove photo" onClick={() => { setPhoto(null); setPreview(null); setWarning(null); }} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-bg/70 backdrop-blur">
                  <X className="size-4" />
                </button>
              )}
            </>
          ) : outfit ? (
            <div className="grid h-full grid-cols-2 gap-2 bg-[#f4f1ec] p-6">
              {outfit.images.slice(0, 6).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="h-full w-full object-contain" />
              ))}
            </div>
          ) : (
            <button onClick={() => camRef.current?.click()} className="grid h-full w-full place-items-center p-8 text-center">
              <div>
                <Camera className="mx-auto size-12 text-accent" />
                <p className="mt-4 font-display text-3xl">Show me the fit</p>
                <p className="mt-2 text-sm text-fg-muted">Full body, good light, mirror selfies welcome.</p>
              </div>
            </button>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-bg/70 backdrop-blur-sm">
              <div className="text-center">
                <div className="relative mx-auto size-20">
                  <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" />
                  <span className="absolute inset-3 grid place-items-center rounded-full bg-accent text-accent-fg">
                    <Sparkles className="size-6" />
                  </span>
                </div>
                <p className="mt-5 text-sm text-fg-muted">{LOADING[step]}</p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => camRef.current?.click()} disabled={busy} variant={photo ? "secondary" : "primary"}>
            <Camera className="size-4" /> {photo ? "Retake" : "Take photo"}
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="size-4" /> Upload
          </Button>
        </div>
        <input ref={camRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        {outfit && !photo && <p className="mt-3 text-xs text-fg-subtle">Rating your saved outfit “{outfit.name}” as a flat-lay. Add a photo to rate it on you instead.</p>}
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-fg-muted">Feedback style</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  mode === m.id ? "border-accent bg-accent/10" : "border-border hover:bg-surface",
                )}
              >
                <m.icon className={cn("size-5", mode === m.id ? "text-accent" : "text-fg-subtle")} />
                <p className="mt-2 text-sm font-medium">{m.label}</p>
                <p className="mt-0.5 hidden text-xs text-fg-subtle sm:block">{m.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-fg-muted">Where are you going?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <button
                key={o}
                onClick={() => setOccasion(occasion === o ? "" : o)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  occasion === o ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted hover:text-fg",
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {warning && (
          <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {warning}
          </p>
        )}
        {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

        <Button size="lg" onClick={submit} disabled={!ready || busy} className="w-full sm:w-auto">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Rate my fit
        </Button>
        <p className="text-xs text-fg-subtle">
          Mirra rates clothes, colors and styling — never your body. Photos are stored privately and you can delete them anytime.
        </p>
      </div>
    </div>
  );
}

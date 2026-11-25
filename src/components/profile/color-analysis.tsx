"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, Lock, RefreshCw, Sun, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { loadImage } from "@/lib/image";
import { sampleFace, type SampleResult } from "@/lib/face-sampler";
import { SEASON_PALETTES, classify, paletteForSeason, type SeasonKey } from "@/lib/seasons";
import { colorName } from "@/lib/colors";
import { savePalette } from "@/app/(app)/profile/actions";
import type { Palette } from "@/lib/types";
import { cn } from "@/lib/utils";

type Quiz = { veins?: "warm" | "cool" | "neutral"; metal?: "warm" | "cool" | "neutral" };

export function ColorAnalysis({ initial }: { initial: Palette | null }) {
  const router = useRouter();
  const toast = useToast();
  const [palette, setPalette] = useState<Palette | null>(initial?.season ? initial : null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [sample, setSample] = useState<SampleResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [quiz, setQuiz] = useState<Quiz>({});
  const [saving, startSaving] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  function quizUndertone(): "warm" | "cool" | "neutral" | undefined {
    const votes = [quiz.veins, quiz.metal].filter(Boolean);
    if (!votes.length) return undefined;
    const w = votes.filter((v) => v === "warm").length;
    const c = votes.filter((v) => v === "cool").length;
    return w > c ? "warm" : c > w ? "cool" : "neutral";
  }

  async function analyze(src: Blob) {
    setError(null);
    setBusy(true);
    try {
      const url = URL.createObjectURL(src);
      setPhoto(url);
      const img = await loadImage(src);
      const s = await sampleFace(img);
      setSample(s);
      if (s.brightness < 70) setError("The photo is quite dark — results may lean too deep. Natural daylight works best.");
      setPalette(classify(s, { undertone: quizUndertone() }));
    } catch (e) {
      setError((e as Error).message || "Couldn't analyze that photo.");
    } finally {
      setBusy(false);
    }
  }

  async function openCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 1280 } });
      streamRef.current = stream;
      setCamera(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
    } catch {
      setError("Couldn't open the camera — allow camera access or upload a selfie instead.");
    }
  }

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCamera(false);
    c.toBlob((b) => b && analyze(b), "image/jpeg", 0.92);
  }

  function reclassify(q: Quiz) {
    setQuiz(q);
    if (sample) {
      const votes = [q.veins, q.metal].filter(Boolean);
      const w = votes.filter((v) => v === "warm").length;
      const c = votes.filter((v) => v === "cool").length;
      const u = votes.length ? (w > c ? "warm" : c > w ? "cool" : "neutral") : undefined;
      setPalette(classify(sample, { undertone: u }));
    }
  }

  function save() {
    if (!palette?.season) return;
    startSaving(async () => {
      const res = await savePalette(palette as Required<Palette>);
      if ("error" in res && res.error) toast(res.error, { tone: "error" });
      else {
        toast("Palette saved — every suggestion now uses it");
        router.refresh();
      }
    });
  }

  const info = palette?.season ? SEASON_PALETTES[palette.season as SeasonKey] : null;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] border border-border bg-surface">
          {camera ? (
            <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          ) : photo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Your selfie" className="h-full w-full object-cover" />
              {sample?.points.map((p, i) => (
                <span
                  key={i}
                  className={cn(
                    "absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white",
                    p.kind === "skin" && "bg-accent",
                    p.kind === "eyes" && "bg-sky-400",
                    p.kind === "hair" && "bg-violet-400",
                  )}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                />
              ))}
            </>
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <Sun className="mx-auto size-10 text-accent" />
                <p className="mt-4 font-display text-3xl">Face the window</p>
                <ul className="mt-3 space-y-1 text-sm text-fg-muted">
                  <li>Natural daylight, no flash</li>
                  <li>No makeup filters or beauty mode</li>
                  <li>Hair visible, face straight on</li>
                </ul>
              </div>
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-bg/60 backdrop-blur-sm">
              <div className="text-center text-sm text-fg-muted">
                <Loader2 className="mx-auto mb-2 size-7 animate-spin text-accent" /> Reading your colors…
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {camera ? (
            <Button onClick={capture}>
              <Camera className="size-4" /> Capture
            </Button>
          ) : (
            <>
              <Button onClick={openCamera} disabled={busy}>
                <Camera className="size-4" /> Use camera
              </Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Upload className="size-4" /> Upload selfie
              </Button>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) analyze(f); e.target.value = ""; }} />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-subtle">
          <Lock className="size-3.5" /> Analyzed on your device. Your selfie is never uploaded or saved.
        </p>
        {error && <p className="mt-3 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">{error}</p>}

        <div className="mt-6 space-y-4 rounded-3xl bg-surface p-5">
          <p className="text-sm font-medium">Fine-tune (optional)</p>
          <QuizRow
            label="Veins on your inner wrist look…"
            options={[["green / olive", "warm"], ["blue / purple", "cool"], ["hard to tell", "neutral"]]}
            value={quiz.veins}
            onChange={(v) => reclassify({ ...quiz, veins: v })}
          />
          <QuizRow
            label="Which jewelry flatters you more?"
            options={[["gold", "warm"], ["silver", "cool"], ["both", "neutral"]]}
            value={quiz.metal}
            onChange={(v) => reclassify({ ...quiz, metal: v })}
          />
        </div>
      </div>

      <div>
        {palette?.season && info ? (
          <div className="glass grain relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.25em] text-fg-subtle">Your season</p>
            <h2 className="mt-2 font-display text-5xl tracking-tight">
              <span className="text-gradient italic">{palette.season}</span>
            </h2>
            <p className="mt-2 text-sm text-fg-muted">{info.blurb}</p>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
              {[
                ["Undertone", palette.undertone],
                ["Depth", palette.depth],
                ["Contrast", palette.contrast],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-surface-2 p-3">
                  <p className="text-fg-subtle">{k}</p>
                  <p className="mt-1 text-sm capitalize text-fg">{v}</p>
                </div>
              ))}
            </div>

            {palette.skin && (
              <div className="mt-4 flex gap-4 text-xs text-fg-muted">
                {[["Skin", palette.skin], ["Hair", palette.hair], ["Eyes", palette.eyes]].map(([k, c]) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className="size-4 rounded-full border border-white/20" style={{ background: c }} /> {k}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-6 text-sm font-medium">Your best colors</p>
            <div className="mt-2 grid grid-cols-8 gap-1.5">
              {palette.best?.map((c) => (
                <span key={c} title={colorName(c)} className="aspect-square rounded-xl border border-white/10" style={{ background: c }} />
              ))}
            </div>
            <p className="mt-5 text-sm font-medium">Go easy on</p>
            <div className="mt-2 grid grid-cols-8 gap-1.5">
              {palette.avoid?.map((c) => (
                <span key={c} title={colorName(c)} className="relative aspect-square rounded-xl border border-white/10" style={{ background: c }}>
                  <span className="absolute inset-0 grid place-items-center text-lg text-white/70">×</span>
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm text-fg-muted">
              Best metals: <span className="text-fg">{palette.metals}</span>
            </p>

            <label className="mt-6 block text-xs text-fg-subtle">
              Disagree? Pick your season manually
              <select
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg"
                value={palette.season}
                onChange={(e) => setPalette(paletteForSeason(palette, e.target.value as SeasonKey))}
              >
                {Object.keys(SEASON_PALETTES).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>

            <div className="mt-6 flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save my palette
              </Button>
              {photo && (
                <Button variant="ghost" onClick={() => { setPhoto(null); setSample(null); }}>
                  <RefreshCw className="size-4" /> Retake
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-border p-8">
            <p className="font-display text-3xl">What you&apos;ll get</p>
            <ul className="mt-4 space-y-2 text-sm text-fg-muted">
              <li>· Your undertone (warm, cool or neutral)</li>
              <li>· Your seasonal type out of 12</li>
              <li>· 8 colors that light you up, and 4 to go easy on</li>
              <li>· Best jewelry metal</li>
              <li>· Fit Checks, the stylist and shopping advice all start using it</li>
            </ul>
            <p className="mt-6 text-xs text-fg-subtle">
              Or skip the selfie and pick your season:
            </p>
            <select
              className="mt-2 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
              defaultValue=""
              onChange={(e) =>
                e.target.value &&
                setPalette(
                  paletteForSeason(
                    { undertone: "neutral", depth: "medium", contrast: "medium", skin: "#c8a58a", hair: "#3a2a20", eyes: "#5a4030" },
                    e.target.value as SeasonKey,
                  ),
                )
              }
            >
              <option value="" disabled>
                Choose a season…
              </option>
              {Object.keys(SEASON_PALETTES).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [string, T][];
  value?: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-xs text-fg-muted">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([l, v]) => (
          <button
            key={l}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs capitalize",
              value === v ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted hover:text-fg",
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

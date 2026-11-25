"use client";

/** Draws a 1080×1350 shareable "Fit Card" image (Instagram portrait) and returns a PNG blob. */
export type CardInput = {
  title: string;
  subtitle?: string;
  score?: number | null;
  breakdown?: { label: string; value: number }[];
  photo?: string | null; // main photo (fit check)
  images?: string[]; // item cutouts (outfit)
  tip?: string | null;
};

function load(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number) {
  const words = text.split(/\s+/);
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      lines++;
      if (lines === maxLines) {
        ctx.fillText(line.replace(/[,.;:]?$/, "…"), x, y);
        return y + lineH;
      }
      ctx.fillText(line, x, y);
      y += lineH;
      line = words[i];
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineH;
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

function contain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export async function renderShareCard(input: CardInput): Promise<Blob> {
  await document.fonts?.ready;
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue("--accent").trim() || "#e8a98f";
  const serif = css.getPropertyValue("--font-instrument-serif").trim() || "Georgia";
  const sans = css.getPropertyValue("--font-geist-sans").trim() || "system-ui";

  // background
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#17131a");
  g.addColorStop(1, "#0b0a0c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 800);
  glow.addColorStop(0, accent + "40");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // image panel
  const px = 70, py = 70, pw = W - 140, ph = 820;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 48);
  ctx.clip();
  ctx.fillStyle = "#211c24";
  ctx.fillRect(px, py, pw, ph);
  if (input.photo) {
    const img = await load(input.photo);
    if (img) cover(ctx, img, px, py, pw, ph);
  } else if (input.images?.length) {
    const imgs = (await Promise.all(input.images.slice(0, 6).map(load))).filter((x): x is HTMLImageElement => !!x);
    const cols = imgs.length <= 2 ? imgs.length || 1 : imgs.length <= 4 ? 2 : 3;
    const rows = Math.ceil(imgs.length / cols) || 1;
    const cw = pw / cols, ch = ph / rows;
    imgs.forEach((img, i) => contain(ctx, img, px + (i % cols) * cw + 30, py + Math.floor(i / cols) * ch + 30, cw - 60, ch - 60));
  }
  ctx.restore();

  // score badge
  if (input.score != null) {
    ctx.fillStyle = "rgba(11,10,12,0.75)";
    ctx.beginPath();
    ctx.arc(px + pw - 110, py + 110, 85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(px + pw - 110, py + 110, 72, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * input.score) / 100);
    ctx.stroke();
    ctx.fillStyle = "#f4efea";
    ctx.textAlign = "center";
    ctx.font = `64px ${serif}`;
    ctx.fillText(String(input.score), px + pw - 110, py + 132);
    ctx.textAlign = "left";
  }

  // text
  let y = py + ph + 90;
  ctx.fillStyle = "#f4efea";
  ctx.font = `76px ${serif}`;
  y = wrap(ctx, input.title, 70, y, W - 140, 80, 1);
  ctx.fillStyle = "#a59ea6";
  ctx.font = `32px ${sans}`;
  if (input.subtitle) y = wrap(ctx, input.subtitle, 70, y - 10, W - 140, 42, 1);

  if (input.breakdown?.length) {
    const bw = (W - 140 - 4 * 20) / 5;
    input.breakdown.slice(0, 5).forEach((b, i) => {
      const bx = 70 + i * (bw + 20);
      ctx.fillStyle = "#a59ea6";
      ctx.font = `22px ${sans}`;
      ctx.fillText(b.label.split(" ")[0], bx, y + 20);
      ctx.fillStyle = "#2e2a31";
      ctx.fillRect(bx, y + 36, bw, 10);
      ctx.fillStyle = accent;
      ctx.fillRect(bx, y + 36, (bw * b.value) / 100, 10);
    });
    y += 90;
  } else if (input.tip) {
    ctx.fillStyle = "#a59ea6";
    ctx.font = `28px ${sans}`;
    y = wrap(ctx, `“${input.tip}”`, 70, y + 10, W - 140, 38, 2);
  }

  // footer
  ctx.fillStyle = accent;
  ctx.font = `44px ${serif}`;
  ctx.fillText("Mirra", 70, H - 60);
  ctx.fillStyle = "#6f6871";
  ctx.font = `24px ${sans}`;
  ctx.textAlign = "right";
  ctx.fillText("Your AI closet & stylist", W - 70, H - 66);

  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the image"))), "image/png"),
  );
}

/** Share via the native share sheet when possible, otherwise download. */
export async function shareOrDownload(blob: Blob, filename: string, text: string) {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}

/** Browser-side image helpers (compression, cropping, quality checks). */

export async function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error(
      typeof src !== "string" && /heic|heif/i.test((src as File).type || (src as File).name || "")
        ? "HEIC photos aren't supported in this browser — export as JPG first."
        : "Couldn't read that image.",
    );
  } finally {
    if (typeof src !== "string") setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image export failed"))), type, quality),
  );
}

/** Resize to fit within `max` px and re-encode (keeps transparency for PNG). */
export async function compressImage(
  src: Blob | string,
  { max = 1400, type = "image/jpeg", quality = 0.86 }: { max?: number; type?: string; quality?: number } = {},
) {
  const img = await loadImage(src);
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  return canvasToBlob(canvas, type, quality);
}

/** Crop a region given in 0–1000 normalized coordinates, with padding. */
export async function cropNormalized(
  src: Blob | string,
  box: { x1: number; y1: number; x2: number; y2: number },
  pad = 0.06,
) {
  const img = await loadImage(src);
  const W = img.naturalWidth, H = img.naturalHeight;
  const bw = ((box.x2 - box.x1) / 1000) * W;
  const bh = ((box.y2 - box.y1) / 1000) * H;
  const x = Math.max(0, (box.x1 / 1000) * W - bw * pad);
  const y = Math.max(0, (box.y1 / 1000) * H - bh * pad);
  const w = Math.min(W - x, bw * (1 + pad * 2));
  const h = Math.min(H - y, bh * (1 + pad * 2));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  canvas.getContext("2d")!.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, "image/jpeg", 0.9);
}

export function dataUrlToBlob(dataUrl: string) {
  const [head, b64] = dataUrl.split(",");
  const type = head.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

/** Rotate an image 90° clockwise. */
export async function rotate90(src: Blob) {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalHeight;
  canvas.height = img.naturalWidth;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, 0, 0);
  return canvasToBlob(canvas, src.type === "image/png" ? "image/png" : "image/jpeg", 0.92);
}

/** Quick quality check: average brightness and a blur estimate. */
export async function photoQuality(src: Blob) {
  const img = await loadImage(src);
  const size = 160;
  const scale = size / Math.max(img.naturalWidth, img.naturalHeight);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = g;
    sum += g;
  }
  // Variance of the Laplacian ≈ sharpness
  let lapSum = 0, lapSq = 0, n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  const mean = lapSum / Math.max(1, n);
  const sharpness = lapSq / Math.max(1, n) - mean * mean;
  const brightness = sum / (w * h);
  return {
    brightness,
    sharpness,
    tooDark: brightness < 45,
    tooBright: brightness > 235,
    blurry: sharpness < 60,
  };
}

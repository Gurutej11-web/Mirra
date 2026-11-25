"use client";

/** In-browser face landmarking + color sampling (photos never leave the device). */
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { rgbToHex } from "@/lib/colors";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

export function getLandmarker() {
  landmarkerPromise ??= (async () => {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 2,
    });
  })().catch((e) => {
    landmarkerPromise = null;
    throw e;
  });
  return landmarkerPromise;
}

// Landmark indices (MediaPipe 478-point mesh)
const CHEEKS = [50, 101, 118, 280, 330, 347];
const FOREHEAD = [151, 9, 108, 337];
const IRIS_L = [469, 470, 471, 472];
const IRIS_R = [474, 475, 476, 477];

export type SampleResult = {
  skin: string;
  hair: string;
  eyes: string;
  faces: number;
  points: { x: number; y: number; kind: "skin" | "hair" | "eyes" }[];
  brightness: number;
};

function patch(data: ImageData, cx: number, cy: number, r: number) {
  const pixels: [number, number, number][] = [];
  const { width, height } = data;
  for (let y = Math.max(0, Math.round(cy - r)); y < Math.min(height, cy + r); y++)
    for (let x = Math.max(0, Math.round(cx - r)); x < Math.min(width, cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      const i = (y * width + x) * 4;
      pixels.push([data.data[i], data.data[i + 1], data.data[i + 2]]);
    }
  return pixels;
}

/** Median-ish average after dropping the brightest/darkest 20% (removes shine and shadow). */
function robustMean(pixels: [number, number, number][]) {
  if (!pixels.length) return { r: 0, g: 0, b: 0 };
  const sorted = [...pixels].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const cut = Math.floor(sorted.length * 0.2);
  const keep = sorted.slice(cut, sorted.length - cut || undefined);
  const s = keep.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
  return { r: s[0] / keep.length, g: s[1] / keep.length, b: s[2] / keep.length };
}

export async function sampleFace(img: HTMLImageElement): Promise<SampleResult> {
  const landmarker = await getLandmarker();
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const result = landmarker.detect(canvas);
  const faces = result.faceLandmarks.length;
  if (!faces) throw new Error("No face found — use a well-lit, front-facing selfie.");

  // Use the largest face
  const face = result.faceLandmarks
    .map((lm) => ({ lm, size: Math.max(...lm.map((p) => p.x)) - Math.min(...lm.map((p) => p.x)) }))
    .sort((a, b) => b.size - a.size)[0].lm;

  const W = canvas.width, H = canvas.height;
  const data = ctx.getImageData(0, 0, W, H);
  const faceW = (Math.max(...face.map((p) => p.x)) - Math.min(...face.map((p) => p.x))) * W;
  const r = Math.max(3, faceW * 0.035);
  const points: SampleResult["points"] = [];

  const skinPx = [...CHEEKS, ...FOREHEAD].flatMap((i) => {
    const p = face[i];
    points.push({ x: p.x, y: p.y, kind: "skin" });
    return patch(data, p.x * W, p.y * H, r);
  });

  const irisPx = [...IRIS_L, ...IRIS_R].flatMap((i) => {
    const p = face[i];
    if (!p) return [];
    points.push({ x: p.x, y: p.y, kind: "eyes" });
    return patch(data, p.x * W, p.y * H, Math.max(1.5, r * 0.35));
  });

  // Hair: above the top of the forehead
  const top = face[10];
  const chin = face[152];
  const faceH = (chin.y - top.y) * H;
  const hairPx = [-0.12, 0, 0.12].flatMap((dx) => {
    const x = top.x + dx * (faceW / W);
    const y = top.y - (faceH * 0.12) / H;
    if (y <= 0) return [];
    points.push({ x, y, kind: "hair" });
    return patch(data, x * W, y * H, r * 1.2);
  });

  const skin = robustMean(skinPx);
  const brightness = (skin.r + skin.g + skin.b) / 3;
  return {
    skin: rgbToHex(skin),
    eyes: rgbToHex(robustMean(irisPx)),
    hair: hairPx.length ? rgbToHex(robustMean(hairPx)) : "#2a2220",
    faces,
    points,
    brightness,
  };
}

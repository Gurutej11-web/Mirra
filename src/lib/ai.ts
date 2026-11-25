import "server-only";
import type { z } from "zod";

export const VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";
export const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || "openai/gpt-oss-120b";

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type ChatMsg = { role: "system" | "user" | "assistant"; content: string | Part[] };

export class AIError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

export function aiConfigured() {
  return !!process.env.GROQ_API_KEY;
}

async function callGroq(model: string, messages: ChatMsg[], opts: { temperature?: number; maxTokens?: number }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new AIError("AI isn't configured — add GROQ_API_KEY to .env.local.", 503);

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 2048,
    response_format: { type: "json_object" },
  };
  if (model.startsWith("qwen/")) body.reasoning_format = "hidden";
  if (model.startsWith("openai/gpt-oss")) body.reasoning_effort = "low";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 429) throw new AIError("The AI is busy right now — try again in a minute.", 429);
    if (!res.ok) {
      const text = await res.text();
      console.error("[groq]", res.status, text.slice(0, 500));
      throw new AIError("The AI couldn't process that request.", 502);
    }
    const json = await res.json();
    return String(json.choices?.[0]?.message?.content ?? "");
  } catch (e) {
    if (e instanceof AIError) throw e;
    if ((e as Error).name === "AbortError") throw new AIError("The AI took too long — please try again.", 504);
    throw new AIError("Couldn't reach the AI service.", 502);
  } finally {
    clearTimeout(timer);
  }
}

function extractJSON(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("No JSON in response");
  }
}

/**
 * Ask a Groq model for JSON and validate it with a zod schema.
 * Retries once on malformed output.
 */
export async function aiJSON<T extends z.ZodTypeAny>(
  schema: T,
  messages: ChatMsg[],
  opts: { model?: string; temperature?: number; maxTokens?: number } = {},
): Promise<z.infer<T>> {
  const model = opts.model ?? TEXT_MODEL;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callGroq(model, messages, opts);
    try {
      const parsed = schema.safeParse(extractJSON(raw));
      if (parsed.success) return parsed.data;
      lastErr = parsed.error;
      console.warn("[ai] schema mismatch", parsed.error.issues.slice(0, 3));
    } catch (e) {
      lastErr = e;
    }
  }
  console.error("[ai] invalid output", lastErr);
  throw new AIError("The AI gave an unexpected answer — please try again.", 502);
}

export const imagePart = (dataUrl: string): Part => ({ type: "image_url", image_url: { url: dataUrl } });
export const textPart = (text: string): Part => ({ type: "text", text });

/** Simple per-user rate limiter (per server instance). */
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) return false;
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

async function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a valid link.");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http(s) links are supported.");
  if (url.username || url.password) throw new Error("Links with credentials aren't supported.");
  const addrs = await lookup(url.hostname, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error("Couldn't find that website.");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("That address isn't allowed.");
  return url;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

/** Fetch a public URL with SSRF protection, redirect re-checks, a timeout and a size cap. */
export async function safeFetch(raw: string, { maxBytes = 3_000_000, accept = "text/html,*/*" } = {}) {
  let current = raw;
  for (let hop = 0; hop < 4; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`The store responded with an error (${res.status}).`);
    const len = Number(res.headers.get("content-length") || 0);
    if (len > maxBytes) throw new Error("That page is too large.");

    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          throw new Error("That page is too large.");
        }
        chunks.push(value);
      }
    }
    return {
      url: url.toString(),
      contentType: res.headers.get("content-type") ?? "",
      body: Buffer.concat(chunks),
    };
  }
  throw new Error("Too many redirects.");
}

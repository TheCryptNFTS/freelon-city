/**
 * Recent transforms feed. Powers a public wall of recently generated image
 * transforms. Capped ring of the last 60 entries at a single Redis list key.
 *
 * recordTransform() is called from the money path (right after a paid render),
 * so it must NEVER throw into the caller — every write is wrapped in try/catch
 * and invalid input is silently dropped. listRecentTransforms() likewise never
 * throws: it returns [] on any error.
 *
 * Mirrors the in-memory-fallback style of lib/wallet-hex-store.ts: a
 * module-level array stands in for Redis when Upstash isn't configured
 * (single-process dev only).
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

export type TransformEntry = { tokenId: number; url: string; style: string; ts: number };

const KEY = "freelon:transforms:recent:v1";
const CAP = 60;

// In-memory fallback (single-process dev). Newest-first, capped to CAP.
const memory: TransformEntry[] = [];

function isValid(e: { tokenId: number; url: string; style: string }): boolean {
  if (!Number.isInteger(e.tokenId) || e.tokenId < 1 || e.tokenId > 4040) return false;
  if (typeof e.url !== "string" || !e.url.startsWith("https://")) return false;
  if (typeof e.style !== "string" || e.style.length === 0 || e.style.length > 40) return false;
  return true;
}

export async function recordTransform(e: {
  tokenId: number;
  url: string;
  style: string;
}): Promise<void> {
  // Validate first — silently drop garbage so the money-path caller is never
  // disturbed by bad input.
  if (!isValid(e)) return;
  const entry: TransformEntry = { tokenId: e.tokenId, url: e.url, style: e.style, ts: Date.now() };
  try {
    if (!hasUpstash) {
      memory.unshift(entry);
      if (memory.length > CAP) memory.length = CAP;
      return;
    }
    const val = JSON.stringify(entry);
    await upstash(["LPUSH", KEY, val]);
    await upstash(["LTRIM", KEY, "0", String(CAP - 1)]);
  } catch {
    // A feed write must never throw into the caller (it's on the money path).
  }
}

export async function listRecentTransforms(limit = 24): Promise<TransformEntry[]> {
  const n = Math.max(1, Math.min(CAP, Math.floor(limit)));
  try {
    if (!hasUpstash) {
      return memory.slice(0, n);
    }
    const raw = (await upstash(["LRANGE", KEY, "0", String(n - 1)])) as unknown;
    if (!Array.isArray(raw)) return [];
    const out: TransformEntry[] = [];
    for (const item of raw) {
      try {
        out.push(JSON.parse(item as string) as TransformEntry);
      } catch {
        // Skip parse failures.
      }
    }
    return out;
  } catch {
    return [];
  }
}

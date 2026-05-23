/**
 * OpenSea fetch helper with 429 backoff + field shape resilience.
 *
 * Centralizes two patterns scattered across app/api/opensea/* and
 * app/api/market/*:
 *   - 429 (rate-limited) → respect Retry-After, one retry, then fail
 *     cleanly. The previous "log + return empty" path silently masked
 *     OpenSea outages from the frontend.
 *   - asset_events / events / nfts shape — OpenSea v2 has shipped
 *     responses under both `asset_events` (events endpoints) and
 *     `events` (some collection endpoints). Provide a single accessor.
 */

import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export type OpenSeaFetchOpts = {
  timeoutMs?: number;
  revalidate?: number;
  retryOn429?: boolean;
};

export type OpenSeaFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; retryAfterSec?: number };

/**
 * Single-retry fetch that respects the OpenSea Retry-After header. If
 * the header is missing or unparseable, falls back to a 1.5s sleep.
 * Returns a structured result so callers can distinguish "transient
 * 429 — try again later" from "true 4xx — bad request".
 */
export async function openseaFetch<T = unknown>(
  url: string,
  opts: OpenSeaFetchOpts = {},
): Promise<OpenSeaFetchResult<T>> {
  const apiKey = process.env.OPENSEA_API_KEY;
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) headers["X-API-KEY"] = apiKey;

  const timeoutMs = opts.timeoutMs ?? 6000;
  const next = opts.revalidate != null ? { revalidate: opts.revalidate } : undefined;
  const retryOn429 = opts.retryOn429 !== false;

  const doFetch = async () =>
    fetchWithTimeout(url, { headers, timeoutMs, ...(next ? { next } : {}) });

  let res: Response | null = null;
  try { res = await doFetch(); } catch { return { ok: false, status: 0 }; }

  if (res.status === 429 && retryOn429) {
    const ra = res.headers.get("retry-after");
    const sleepMs = ra
      ? Math.min(parseFloat(ra) * 1000, 5000)
      : 1500;
    await new Promise((r) => setTimeout(r, isFinite(sleepMs) && sleepMs > 0 ? sleepMs : 1500));
    try { res = await doFetch(); } catch { return { ok: false, status: 0 }; }
  }

  if (!res.ok) {
    const retryAfterSec = res.status === 429
      ? Number(res.headers.get("retry-after") || "5")
      : undefined;
    return { ok: false, status: res.status, retryAfterSec };
  }

  try {
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0 };
  }
}

/**
 * Pulls the events array regardless of whether OpenSea returns it as
 * `asset_events` (current standard) or `events` (some endpoints).
 * Returns [] if neither field is present.
 */
export function extractEvents<T = unknown>(
  payload: unknown,
): T[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const a = Array.isArray(p.asset_events) ? p.asset_events : null;
  if (a) return a as T[];
  const b = Array.isArray(p.events) ? p.events : null;
  if (b) return b as T[];
  return [];
}

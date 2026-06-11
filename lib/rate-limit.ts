/**
 * Sliding-window rate limit. In-memory for dev, Upstash REST for prod.
 * 30 req/min per IP per route by default.
 */
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { upstash, hasUpstash } from "@/lib/upstash-client";

const memory = new Map<string, { count: number; reset: number }>();

// Prefix every untrusted/shared-fallback bucket key with this marker so limit()
// can recognize it and clamp it to a strict cap (see UNKNOWN_MAX). On the Vercel
// prod path x-real-ip is always set, so this marker is never produced there.
const UNKNOWN_PREFIX = "unknown";

/**
 * Resolve a rate-limit identity for the request.
 *
 * Vercel/prod path is unchanged: x-real-ip is set by Vercel's edge, cannot be
 * spoofed, and is returned verbatim as a trusted per-IP identity.
 *
 * When no trustworthy IP exists, we DO NOT mint per-request buckets from the
 * spoofable XFF (that would let an attacker fan out and burn the OpenSea quota).
 * Instead we return an `unknown`-prefixed bucket. limit() detects this prefix
 * and applies a much stricter shared cap, so a caller who lands in the shared
 * bucket can't drain a large per-IP allowance. We also optionally fold a COARSE,
 * non-authoritative signal (UA + leftmost XFF hash) into the key purely to
 * reduce collateral between unrelated unknown callers — it is never treated as
 * a trusted unique identity and the strict cap still applies regardless.
 */
export function getIp(req: Request): string {
  // Prefer the trusted Vercel header (x-real-ip is set by Vercel's edge and
  // cannot be spoofed by clients). On Vercel/prod this is always present, so
  // it is the only source we need.
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // SECURITY: X-Forwarded-For is fully client-controlled. If we fell back to
  // it unconditionally, an attacker could rotate XFF per request to mint
  // unlimited rate-limit buckets and burn the OpenSea quota. So we only trust
  // XFF as a unique identity when the operator has explicitly opted in (e.g.
  // self-hosting behind a trusted reverse proxy that overwrites the header).
  // Default: OFF.
  if (process.env.RATE_LIMIT_TRUST_XFF === "true") {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
  }

  // No trusted IP source. Land in an `unknown`-prefixed bucket that limit()
  // clamps to a strict shared cap. Fold a coarse UA + leftmost-XFF hash into
  // the key ONLY to reduce collateral between unrelated unknown callers; this
  // is spoofable and is NEVER trusted as identity — the strict cap is what
  // actually bounds abuse here.
  const ua = req.headers.get("user-agent") ?? "";
  const xffLeft = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const coarse = crypto
    .createHash("sha256")
    .update(`${ua}|${xffLeft}`)
    .digest("hex")
    .slice(0, 16);
  return `${UNKNOWN_PREFIX}:${coarse}`;
}

// Whether a resolved identity is the untrusted shared-fallback bucket.
function isUnknown(ip: string): boolean {
  return ip === UNKNOWN_PREFIX || ip.startsWith(`${UNKNOWN_PREFIX}:`);
}

// Hard ceiling for any unknown/shared-fallback bucket. We take the stricter of
// a small fraction of the route's normal max and an absolute tiny cap, so even
// a high-max route (e.g. max=60) can't be abused via the shared bucket.
const UNKNOWN_ABS_CAP = 10;
function unknownMax(max: number): number {
  return Math.max(1, Math.min(UNKNOWN_ABS_CAP, Math.ceil(max / 5)));
}

export type LimitState = { ok: boolean; remaining: number; reset: number };

export async function limit(
  req: Request,
  route: string,
  opts?: { max?: number; windowSec?: number },
): Promise<LimitState> {
  const baseMax = opts?.max ?? 30;
  const windowSec = opts?.windowSec ?? 60;
  const ip = getIp(req);
  // Untrusted shared-fallback callers are clamped to a strict cap so one
  // attacker can't exhaust a large per-IP allowance. Trusted (x-real-ip /
  // opted-in XFF) callers keep the route's normal max — Vercel prod unchanged.
  const max = isUnknown(ip) ? unknownMax(baseMax) : baseMax;
  const key = `freelon:rl:${route}:${ip}`;
  const now = Date.now();
  const reset = now + windowSec * 1000;

  if (hasUpstash) {
    try {
      const count = Number(await upstash(["INCR", key]));
      if (count === 1) await upstash(["EXPIRE", key, String(windowSec)]);
      return { ok: count <= max, remaining: Math.max(0, max - count), reset };
    } catch {
      // Fall through to memory if Upstash temporarily fails.
    }
  }

  const cur = memory.get(key);
  if (!cur || cur.reset <= now) {
    memory.set(key, { count: 1, reset });
    return { ok: true, remaining: max - 1, reset };
  }
  cur.count += 1;
  return { ok: cur.count <= max, remaining: Math.max(0, max - cur.count), reset: cur.reset };
}

/**
 * 429 response. `extraHeaders` lets cross-origin routes merge their CORS
 * headers in — the limit check runs BEFORE a route attaches CORS, and a 429
 * without Access-Control-Allow-Origin reads as an opaque network error to the
 * game SPA, so its retry logic can't see Retry-After to back off.
 */
export function tooManyResponse(state: LimitState, extraHeaders?: Record<string, string>) {
  return NextResponse.json(
    { error: "rate limited", reset: state.reset },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((state.reset - Date.now()) / 1000))),
        "X-RateLimit-Remaining": String(state.remaining),
        "X-RateLimit-Reset": String(state.reset),
        ...(extraHeaders ?? {}),
      },
    },
  );
}

/**
 * Sliding-window rate limit. In-memory for dev, Upstash REST for prod.
 * 30 req/min per IP per route by default.
 */
import { NextResponse } from "next/server";
import { upstash, hasUpstash } from "@/lib/upstash-client";

const memory = new Map<string, { count: number; reset: number }>();

function getIp(req: Request): string {
  // Prefer the trusted Vercel header (x-real-ip is set by Vercel's edge and
  // cannot be spoofed by clients). On Vercel/prod this is always present, so
  // it is the only source we need.
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // SECURITY: X-Forwarded-For is fully client-controlled. If we fell back to
  // it unconditionally, an attacker could rotate XFF per request to mint
  // unlimited rate-limit buckets and burn the OpenSea quota. So we only trust
  // XFF when the operator has explicitly opted in (e.g. self-hosting behind a
  // trusted reverse proxy that overwrites the header). Default: OFF.
  if (process.env.RATE_LIMIT_TRUST_XFF === "true") {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
  }

  // No trusted IP source. Collapse everyone into a single shared bucket so a
  // spoofer can't fan out across buckets — fail to a shared limit, not none.
  return "unknown";
}

export type LimitState = { ok: boolean; remaining: number; reset: number };

export async function limit(
  req: Request,
  route: string,
  opts?: { max?: number; windowSec?: number },
): Promise<LimitState> {
  const max = opts?.max ?? 30;
  const windowSec = opts?.windowSec ?? 60;
  const ip = getIp(req);
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

export function tooManyResponse(state: LimitState) {
  return NextResponse.json(
    { error: "rate limited", reset: state.reset },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((state.reset - Date.now()) / 1000))),
        "X-RateLimit-Remaining": String(state.remaining),
        "X-RateLimit-Reset": String(state.reset),
      },
    },
  );
}

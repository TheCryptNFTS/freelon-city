/**
 * Sliding-window rate limit. In-memory for dev, Upstash REST for prod.
 * 30 req/min per IP per route by default.
 */
import { NextResponse } from "next/server";
import { upstash, hasUpstash } from "@/lib/upstash-client";

const memory = new Map<string, { count: number; reset: number }>();

function getIp(req: Request): string {
  // Prefer the trusted Vercel header (x-real-ip is set by Vercel's edge and
  // cannot be spoofed by clients). Fall back to X-Forwarded-For for non-Vercel
  // deployments, taking the LEFTMOST value (the original client). Without
  // this ordering, an attacker can rotate X-Forwarded-For per request to
  // bypass per-IP limits entirely.
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
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

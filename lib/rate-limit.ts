/**
 * Sliding-window rate limit. In-memory for dev, Upstash REST for prod.
 * 30 req/min per IP per route by default.
 */
import { NextResponse } from "next/server";

const memory = new Map<string, { count: number; reset: number }>();
const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

async function upstash(cmd: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const j = (await res.json()) as { result: unknown };
  return j.result;
}

function getIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
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

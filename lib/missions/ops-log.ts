/**
 * OPS LOG — lightweight operational telemetry for the paid-agent system:
 * per-UTC-day token spend, run counts, and an error ring-buffer. This is the
 * "can I SEE what's happening" layer a company needs before taking money — so
 * failures are recorded (not just heard about on Discord) and actual LLM cost is
 * visible without waiting for the provider bill.
 *
 * Cheap + non-fatal: every call is best-effort and must NEVER break a mission.
 * Upstash in prod, in-memory (globalThis-shared) fallback in dev. Ready to point
 * at Sentry/Datadog later — recordError is the single hook to forward from.
 */
import { upstash, hasUpstash } from "@/lib/upstash-client";

const utcDay = () => new Date().toISOString().slice(0, 10);

// Cost estimate in micro-dollars (µ$) per token, by tier. Conservative — rounded
// up so estimated spend lands at/above real spend. Tune via env if model prices move.
function microPerToken(tier: "premium" | "cheap"): { in: number; out: number } {
  // premium ~ gpt-5.5 ($5/$30 per M assumed) ; cheap ~ gpt-4o-mini (~$0.15/$0.60 per M)
  return tier === "premium" ? { in: 5, out: 30 } : { in: 0.15, out: 0.6 };
}

const K_RUNS = () => `freelon:ops:runs:${utcDay()}`;
const K_COST = () => `freelon:ops:costµ:${utcDay()}`; // accumulated micro-dollars
const K_IMG = () => `freelon:ops:images:${utcDay()}`;
const K_VID = () => `freelon:ops:videos:${utcDay()}`;
const K_ERR = "freelon:ops:errors"; // capped list, newest first
const ERR_CAP = 100;
const DAY_TTL = 40 * 24 * 60 * 60;

type Mem = { runs: Map<string, number>; cost: Map<string, number>; img: Map<string, number>; vid: Map<string, number>; errors: OpsError[] };
const mem: Mem = ((globalThis as { __freelonOpsMem?: Mem }).__freelonOpsMem ??= {
  runs: new Map(), cost: new Map(), img: new Map(), vid: new Map(), errors: [],
});

export type OpsError = { ts: number; where: string; error: string; tokenId?: number; wallet?: string };

/** Record a completed LLM run's real token usage → today's cost tally. */
export async function recordRunCost(args: {
  tier: "premium" | "cheap";
  promptTokens: number;
  completionTokens: number;
}): Promise<void> {
  const rate = microPerToken(args.tier);
  const microUsd = Math.ceil(args.promptTokens * rate.in + args.completionTokens * rate.out);
  if (hasUpstash) {
    try {
      await upstash(["INCR", K_RUNS()]).catch(() => {});
      const t = await upstash(["INCRBY", K_COST(), String(microUsd)]);
      if (Number(t) === microUsd) await upstash(["EXPIRE", K_COST(), String(DAY_TTL)]).catch(() => {});
      return;
    } catch { /* fall through */ }
  }
  mem.runs.set(K_RUNS(), (mem.runs.get(K_RUNS()) ?? 0) + 1);
  mem.cost.set(K_COST(), (mem.cost.get(K_COST()) ?? 0) + microUsd);
}

/** Record an image generation (flat-cost lever, tracked separately). */
export async function recordImage(microUsd = 46500): Promise<void> { // ~$0.0465
  if (hasUpstash) {
    try {
      await upstash(["INCR", K_IMG()]).catch(() => {});
      const t = await upstash(["INCRBY", K_COST(), String(microUsd)]);
      if (Number(t) === microUsd) await upstash(["EXPIRE", K_COST(), String(DAY_TTL)]).catch(() => {});
      return;
    } catch { /* fall through */ }
  }
  mem.img.set(K_IMG(), (mem.img.get(K_IMG()) ?? 0) + 1);
  mem.cost.set(K_COST(), (mem.cost.get(K_COST()) ?? 0) + microUsd);
}

/** Record a video generation (expensive lever, tracked separately). Default ~$0.50. */
export async function recordVideo(microUsd = 500000): Promise<void> {
  if (hasUpstash) {
    try {
      await upstash(["INCR", K_VID()]).catch(() => {});
      const t = await upstash(["INCRBY", K_COST(), String(microUsd)]);
      if (Number(t) === microUsd) await upstash(["EXPIRE", K_COST(), String(DAY_TTL)]).catch(() => {});
      return;
    } catch { /* fall through */ }
  }
  mem.vid.set(K_VID(), (mem.vid.get(K_VID()) ?? 0) + 1);
  mem.cost.set(K_COST(), (mem.cost.get(K_COST()) ?? 0) + microUsd);
}

/**
 * Forward an error to Sentry IF configured. DSN-gated: no SENTRY_DSN → no-op, so
 * this is safe to ship before signing up. Uses the already-installed
 * @sentry/nextjs via dynamic import (never blocks; failure is swallowed).
 */
async function forwardToSentry(rec: OpsError): Promise<void> {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(new Error(`[${rec.where}] ${rec.error}`), {
      tags: { where: rec.where },
      extra: { tokenId: rec.tokenId, wallet: rec.wallet, ts: rec.ts },
    });
  } catch { /* Sentry not available / not initialized — non-fatal */ }
}

/** Record an operational error → ring buffer (always) + Sentry (if configured). */
export async function recordError(where: string, error: unknown, ctx?: { tokenId?: number; wallet?: string }): Promise<void> {
  const rec: OpsError = {
    ts: Date.now(),
    where,
    error: (error instanceof Error ? error.message : String(error)).slice(0, 300),
    tokenId: ctx?.tokenId,
    wallet: ctx?.wallet ? `${ctx.wallet.slice(0, 6)}…${ctx.wallet.slice(-4)}` : undefined,
  };
  // Best-effort Sentry forward (DSN-gated, never blocks).
  forwardToSentry(rec).catch(() => {});
  if (hasUpstash) {
    try {
      await upstash(["LPUSH", K_ERR, JSON.stringify(rec)]).catch(() => {});
      await upstash(["LTRIM", K_ERR, "0", String(ERR_CAP - 1)]).catch(() => {});
      return;
    } catch { /* fall through */ }
  }
  mem.errors.unshift(rec);
  if (mem.errors.length > ERR_CAP) mem.errors.length = ERR_CAP;
}

export type OpsSnapshot = {
  day: string;
  runs: number;
  images: number;
  videos: number;
  estCostUsd: number;
  recentErrors: OpsError[];
};

/** Read-only snapshot for the admin cost/health dashboard. */
export async function opsSnapshot(): Promise<OpsSnapshot> {
  let runs = 0, images = 0, videos = 0, microUsd = 0;
  let errors: OpsError[] = [];
  if (hasUpstash) {
    try {
      const [r, c, i, v, e] = (await Promise.all([
        upstash(["GET", K_RUNS()]),
        upstash(["GET", K_COST()]),
        upstash(["GET", K_IMG()]),
        upstash(["GET", K_VID()]),
        upstash(["LRANGE", K_ERR, "0", "24"]),
      ])) as [string | null, string | null, string | null, string | null, string[] | null];
      runs = Number(r ?? 0); microUsd = Number(c ?? 0); images = Number(i ?? 0); videos = Number(v ?? 0);
      errors = Array.isArray(e) ? e.map((s) => JSON.parse(s) as OpsError) : [];
    } catch { /* fall through to mem */ }
  } else {
    runs = mem.runs.get(K_RUNS()) ?? 0;
    microUsd = mem.cost.get(K_COST()) ?? 0;
    images = mem.img.get(K_IMG()) ?? 0;
    videos = mem.vid.get(K_VID()) ?? 0;
    errors = mem.errors.slice(0, 25);
  }
  return { day: utcDay(), runs, images, videos, estCostUsd: Math.round(microUsd / 10000) / 100, recentErrors: errors };
}

import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCitizen } from "@/lib/citizens";
import { getProgress } from "@/lib/progression-store";
import { getMission } from "@/lib/missions";
import type { MissionContext } from "@/lib/missions";
import { upstash, hasUpstash } from "@/lib/upstash-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUBLIC FREE DEMO — the "taste" before the wall (2026-06-05). A logged-out
 * visitor runs ONE real Strategy job on a fixed showcase citizen so they see the
 * genuine quality before unlocking a FREELON of their own.
 *
 * Heavily fenced so it can't be farmed or used to drain LLM cost:
 *   - showcase citizen ALLOWLIST (not any token)
 *   - Strategy ability only, cheap model (paid:false)
 *   - NO persistence (no XP, no level, no work-log — like the admin dry-run)
 *   - ONE run per IP per UTC day (atomic SET-NX)
 *   - counted against the global free $ budget (same cost guard as free missions)
 *   - same-origin (CSRF) + rate limited
 */

// Citizens the public demo may run on. Stable, recognizable, owned by the project.
const SHOWCASE_TOKENS = [1, 7, 404];

// Strategy tasks the demo allows (mirrors analyst.ts task keys).
const DEMO_TASKS = new Set(["fix-launch", "growth-plan", "positioning", "audit"]);

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function clientIp(req: Request): string {
  // Use the PLATFORM-trusted client IP, NOT the left-most x-forwarded-for value
  // (that one is attacker-supplied — a spoofed XFF would get a fresh 1/day bucket
  // every request). Vercel sets x-real-ip / x-vercel-forwarded-for to the real edge
  // client; fall back to the RIGHT-most XFF hop (closest to our proxy). (red-team H3)
  const real = (req.headers.get("x-real-ip") || req.headers.get("x-vercel-forwarded-for") || "").trim();
  if (real) return real;
  const xff = (req.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : ""; // right-most = closest trusted hop
}

export async function POST(req: Request) {
  // Rate limit + CSRF.
  const rl = await limit(req, "demo:run", { max: 6, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { tokenId?: number; task?: string; brief?: string };

  const tokenId = Number(body.tokenId);
  if (!SHOWCASE_TOKENS.includes(tokenId)) {
    return NextResponse.json({ error: "bad_token", message: "Demo runs on a showcase FREELON only." }, { status: 400 });
  }
  const task = DEMO_TASKS.has(String(body.task)) ? String(body.task) : "fix-launch";
  const brief = String(body.brief || "").trim().slice(0, 400);
  if (!brief) {
    return NextResponse.json({ error: "no_brief", message: "Describe your project so the agent can help." }, { status: 400 });
  }

  // ONE demo per IP per UTC day — atomic SET-NX so it can't be raced. We only
  // gate when we can actually identify the IP (else we'd bucket every visitor
  // into one shared slot and lock them all out); the global budget + rate limit
  // still bound spend when the IP is unknown.
  const ip = clientIp(req);
  const dayKey = ip ? `freelon:demo:ip:${ip}:${utcDay()}` : null;
  let claimedDayKey: string | null = null;
  if (hasUpstash && dayKey) {
    try {
      const ok = await upstash(["SET", dayKey, "1", "NX", "EX", String(25 * 60 * 60)]);
      if (ok !== "OK") {
        return NextResponse.json(
          { error: "demo_used", message: "You've used today's free demo. Unlock a FREELON to train your own — it remembers everything." },
          { status: 429 },
        );
      }
      claimedDayKey = dayKey; // release this if the run fails → don't burn the visitor's one try
    } catch { /* infra hiccup → allow (rare) */ }
  }
  const releaseDay = async () => {
    if (claimedDayKey && hasUpstash) { try { await upstash(["DEL", claimedDayKey]); } catch { /* best-effort */ } }
  };

  // Cost guard: count this against the SEPARATE demo $ budget (so demo abuse can't
  // starve owners' free runs) + kill-switch. (red-team H4)
  const { agentsKilled, consumeDemoRun, refundDemoRun, RUN_COST_CENTS } = await import("@/lib/missions/budget");
  if (agentsKilled()) {
    return NextResponse.json({ error: "offline", message: "The agents are briefly offline. Back shortly." }, { status: 503 });
  }
  const budget = await consumeDemoRun(RUN_COST_CENTS.text);
  if (!budget.ok) {
    await releaseDay();
    return NextResponse.json(
      { error: "capacity", message: "Today's free demos are used up. Back at UTC midnight — or unlock a FREELON now." },
      { status: 503 },
    );
  }

  const citizen = getCitizen(tokenId);
  const mission = getMission("strategy");
  if (!citizen || !mission) {
    await refundDemoRun(RUN_COST_CENTS.text);
    await releaseDay();
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const progress = await getProgress(tokenId);
  // paid:false → cheap model (the demo is a taste, not the deep paid output).
  // NO persistence: we call the resolver directly, never applyMission/addAgentWork.
  const ctx: MissionContext = {
    citizen,
    progress,
    input: `${task}: ${brief}`,
    walletAddress: "public-demo",
    paid: false,
  };

  try {
    const output = await mission.resolve(ctx);
    if (!output.ok) {
      await refundDemoRun(RUN_COST_CENTS.text);
      await releaseDay(); // a failed demo must not burn the visitor's one daily try
      return NextResponse.json({ error: "no_output", message: "The agent couldn't complete that — try again." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, demo: true, title: output.title, body: output.body });
  } catch {
    await refundDemoRun(RUN_COST_CENTS.text);
    await releaseDay();
    return NextResponse.json({ error: "failed", message: "The agent couldn't be reached — try again." }, { status: 502 });
  }
}

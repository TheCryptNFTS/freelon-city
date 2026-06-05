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
  const xff = req.headers.get("x-forwarded-for") || "";
  return (xff.split(",")[0] || "unknown").trim();
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

  // ONE demo per IP per UTC day — atomic SET-NX so it can't be raced.
  const ip = clientIp(req);
  const dayKey = `freelon:demo:ip:${ip}:${utcDay()}`;
  if (hasUpstash) {
    try {
      const ok = await upstash(["SET", dayKey, "1", "NX", "EX", String(25 * 60 * 60)]);
      if (ok !== "OK") {
        return NextResponse.json(
          { error: "demo_used", message: "You've used today's free demo. Unlock a FREELON to train your own — it remembers everything." },
          { status: 429 },
        );
      }
    } catch { /* infra hiccup → allow (rare) */ }
  }

  // Cost guard: count this against the global free $ budget + kill-switch.
  const { agentsKilled, consumeFreeRun, refundFreeRun, RUN_COST_CENTS } = await import("@/lib/missions/budget");
  if (agentsKilled()) {
    return NextResponse.json({ error: "offline", message: "The agents are briefly offline. Back shortly." }, { status: 503 });
  }
  const budget = await consumeFreeRun(RUN_COST_CENTS.text);
  if (!budget.ok) {
    return NextResponse.json(
      { error: "capacity", message: "Today's free demos are used up. Back at UTC midnight — or unlock a FREELON now." },
      { status: 503 },
    );
  }

  const citizen = getCitizen(tokenId);
  const mission = getMission("strategy");
  if (!citizen || !mission) {
    await refundFreeRun(RUN_COST_CENTS.text);
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
      await refundFreeRun(RUN_COST_CENTS.text);
      return NextResponse.json({ error: "no_output", message: "The agent couldn't complete that — try again." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, demo: true, title: output.title, body: output.body });
  } catch {
    await refundFreeRun(RUN_COST_CENTS.text);
    return NextResponse.json({ error: "failed", message: "The agent couldn't be reached — try again." }, { status: 502 });
  }
}

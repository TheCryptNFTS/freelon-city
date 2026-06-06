import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCitizen } from "@/lib/citizens";
import { getProgress } from "@/lib/progression-store";
import { buildPersona } from "@/lib/missions/persona";
import { citizenReason } from "@/lib/missions/llm";
import { modelFor } from "@/lib/missions/models";
import { agentsKilled, demoLive, consumeDemoRun, refundDemoRun, RUN_COST_CENTS } from "@/lib/missions/budget";
import { isSameOrigin } from "@/lib/x-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The LLM call can take 20–30s; give the function room to return a clean result
// or a clean timeout rather than being killed at Vercel's default. (cheap model
// only, demo cap is 320 tokens so this is well under the limit.)
export const maxDuration = 60;

/**
 * PUBLIC NO-WALLET AGENT DEMO — the cold-visitor comprehension hook.
 *
 * A logged-out visitor with no wallet can watch ONE real agent run, so the
 * /citizens/[id] page actually DOES something instead of being a pure buy-wall.
 * It reuses the real persona + LLM pipeline (so the output is genuinely this
 * citizen reasoning, not a canned string), but is fenced off from every paid /
 * stateful path:
 *
 *   · DEFAULT OFF — returns { live:false } unless AGENT_DEMO_LIVE=1 is set. An
 *     accidental deploy never opens a public spend faucet.
 *   · CURATED BRIEFS ONLY — the visitor picks from a fixed allowlist; there is
 *     NO free-form input, so this is not a free public LLM and the abuse surface
 *     is a handful of fixed prompts.
 *   · CHEAP MODEL + hard 320-token cap — bounds per-run cost.
 *   · SEPARATE tiny daily $ pool (consumeDemoRun, default $3) — can't drain the
 *     owner budget; refunded on failure.
 *   · STRICT per-IP rate limit (3/min) + same-origin CSRF.
 *   · NO WRITES — no progression, no XP, no agent-history, no transforms feed.
 *     A demo run leaves zero trace on the citizen; it never fakes a résumé.
 */

// Curated briefs — fixed allowlist, no free-form input. Each is phrased so the
// agent showcases a DIFFERENT capability (self-intro / planning / red-team).
const DEMO_BRIEFS: Record<string, string> = {
  intro:
    "Someone just discovered you and owns nothing yet. In your own voice, tell them who you are and the single most useful thing you could do for them if they owned you. Keep it under 90 words.",
  plan:
    "A newcomer wants to use you for their project but doesn't know where to start. Give them a sharp, concrete 3-step plan for the first week of working with you. Under 110 words.",
  redteam:
    "Red-team this plan in 3 short bullets, then one sentence on the biggest risk: 'launch a community token first, figure out the product later.' Stay in character. Under 110 words.",
};

const DEMO_LABELS: Record<string, string> = {
  intro: "Introduce yourself",
  plan: "Plan my first week",
  redteam: "Red-team an idea",
};

// GET — tells the client whether the demo is live and (if so) the curated brief
// menu. When the flag is off this returns { live:false } and the UI hides the
// whole demo block (so OFF-by-default is enforced on the client too).
export async function GET(req: Request) {
  const rl = await limit(req, "citizen:demo:get", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!demoLive() || agentsKilled()) return NextResponse.json({ live: false });
  return NextResponse.json({
    live: true,
    briefs: Object.keys(DEMO_BRIEFS).map((id) => ({ id, label: DEMO_LABELS[id] })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 1. STRICT per-IP rate limit (much tighter than the owner mission route).
  const rl = await limit(req, "citizen:demo", { max: 3, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  // 2. CSRF: same-origin only.
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  // 3. Flag + kill-switch — dark unless explicitly switched on.
  if (!demoLive()) return NextResponse.json({ error: "demo_disabled" }, { status: 404 });
  if (agentsKilled()) {
    return NextResponse.json(
      { error: "agents_offline", message: "The agents are briefly offline. Back shortly." },
      { status: 503 },
    );
  }

  // 4. Provider guard — no key, no point charging the pool.
  if (!process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "demo_unavailable" }, { status: 503 });
  }

  // 5. Validate citizen id.
  const { id } = await params;
  const cid = parseInt(id, 10);
  const citizen = getCitizen(cid);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040 || !citizen) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  // 6. Validate the brief against the curated allowlist — NO free-form input.
  const body = (await req.json().catch(() => ({}))) as { briefId?: string };
  const briefId = (body.briefId ?? "").trim();
  const brief = DEMO_BRIEFS[briefId];
  if (!brief) return NextResponse.json({ error: "unknown_brief" }, { status: 400 });

  // 7. Charge the SEPARATE demo $ pool (refunded on failure). Tiny independent
  //    ceiling so the public demo can never drain the owner budget.
  const budget = await consumeDemoRun(RUN_COST_CENTS.text);
  if (!budget.ok) {
    return NextResponse.json(
      {
        capacity: true,
        message:
          budget.reason === "killed"
            ? "The agents are briefly offline. Back shortly."
            : "The live demo hit today's free capacity. Back at UTC midnight — or own a FREELON to run it yourself.",
      },
      { status: 503 },
    );
  }

  // 8. Build the REAL persona (server-authored; the curated brief goes ONLY in
  //    the user role — same prompt-injection posture as the owner path) and run
  //    the cheap model with a hard 320-token cap.
  const progress = await getProgress(cid);
  const persona = buildPersona(citizen, progress, null, { paid: false });
  const maxTokens = Math.min(persona.maxTokens, 320);

  let result;
  try {
    result = await citizenReason({
      system: persona.system,
      user: brief,
      maxTokens,
      model: modelFor("dailyCheckIn"),
      timeoutMs: 28_000,
    });
  } catch {
    result = { ok: false as const, error: "llm_error" };
  }

  if (!result.ok) {
    // No output → give the pool charge back. A failed demo costs nothing.
    await refundDemoRun(RUN_COST_CENTS.text).catch(() => {});
    return NextResponse.json(
      { error: "demo_failed", message: "The signal dropped. Try again." },
      { status: 502 },
    );
  }

  // 9. Return the output. NO writes of any kind — no progression, no XP, no
  //    agent-history, no transforms feed. A demo leaves zero trace.
  const name = citizen.transmission_name || citizen.honoree || `Citizen #${String(cid).padStart(4, "0")}`;
  return NextResponse.json({
    ok: true,
    tokenId: cid,
    name,
    brief: DEMO_LABELS[briefId],
    output: result.text,
  });
}

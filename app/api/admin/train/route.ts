import { NextResponse } from "next/server";
import { runRealMission } from "@/lib/missions/train";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // real LLM calls in a batch — allow time

/**
 * FOUNDER TRAIN TOOL — run a batch of REAL missions on ONE citizen, producing
 * genuine history (real AI output, real progression). Unlike seed-demo (fake
 * numbers), these agents actually did the work.
 *
 * SAFETY: gated by ADMIN_SEED_KEY (404 unset, 403 wrong key). Refuses to write
 * to a prod-Upstash instance unless SEED_DEMO_ALLOW_UPSTASH=1 (so a stray call
 * from a server wired to prod can't run up cost / write live data by accident).
 *
 * Body: { tokenId, jobs: [{ missionId, brief }, ...] }
 *   missionId is a registered ability id (content/strategy/sales/research/design/risk)
 *   brief is "taskKey: the actual brief" (e.g. "growth-plan: how do I get 100 users?")
 *
 * Each job is a real LLM call (~$0.002 on the cheap model). ~15 jobs ≈ Level 10+.
 */
export async function POST(req: Request) {
  const key = process.env.ADMIN_SEED_KEY;
  if (!key) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const url = new URL(req.url);
  const given = url.searchParams.get("key") || req.headers.get("x-admin-key") || "";
  if (given !== key) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { hasUpstash } = await import("@/lib/upstash-client");
  if (hasUpstash && process.env.SEED_DEMO_ALLOW_UPSTASH !== "1") {
    return NextResponse.json(
      { error: "refused_upstash", message: "Wired to Upstash. Run on a no-Upstash local instance, or set SEED_DEMO_ALLOW_UPSTASH=1 to override." },
      { status: 409 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    tokenId?: number;
    jobs?: { missionId: string; brief: string }[];
  };
  const tokenId = Number(body.tokenId);
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) {
    return NextResponse.json({ error: "bad_token" }, { status: 400 });
  }
  const jobs = Array.isArray(body.jobs) ? body.jobs.slice(0, 40) : [];
  if (jobs.length === 0) return NextResponse.json({ error: "no_jobs" }, { status: 400 });

  const results = [];
  for (const j of jobs) {
    const r = await runRealMission({ tokenId, missionId: j.missionId, brief: j.brief });
    results.push(r);
  }
  const ok = results.filter((r) => r.ok).length;
  const finalLevel = results.filter((r) => r.ok).map((r) => (r.ok ? r.level : 0)).pop() ?? null;

  return NextResponse.json({ ok: true, tokenId, ran: jobs.length, succeeded: ok, finalLevel, results });
}

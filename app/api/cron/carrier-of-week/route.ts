/**
 * Vercel cron — weekly "Carrier of the Week" resolution.
 *
 * Mirrors the sweep-bounty / weekly-receipts trigger pattern: Bearer-auth on
 * CRON_SECRET, then calls resolveCarrierOfWeek() which is ISO-week-idempotent
 * (a SET-NX gate means only the first call per week does the work). Safe to run
 * on any schedule — extra ticks within the same week are no-ops.
 *
 * Recognition only: NO ⬡ is moved anywhere in this path.
 *
 * Kill-switch: CARRIER_OF_WEEK_OFF=1 short-circuits the resolution (feature can
 * be disabled without a redeploy of the page).
 *
 * Manual trigger (dev/admin): pass ?force=1 with the Bearer secret to bypass
 * the week gate and re-resolve immediately.
 *
 * Requires: CRON_SECRET (Bearer auth — same as the other crons).
 */
import { NextResponse } from "next/server";
import { resolveCarrierOfWeek } from "@/lib/carrier-of-week";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  // Fail closed in ALL environments — same posture as sweep-bounty/daily-signal.
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_unconfigured" }, { status: 503 });
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (process.env.CARRIER_OF_WEEK_OFF === "1") {
    return NextResponse.json({ ok: true, reason: "feature_off", crowned: false });
  }

  const force = new URL(req.url).searchParams.get("force") === "1";

  try {
    const result = await resolveCarrierOfWeek({ force });
    return NextResponse.json({ ...result, ranAt: Date.now() });
  } catch (e) {
    // Never throw out of the cron — resolveCarrierOfWeek is already fail-safe,
    // but belt-and-suspenders so one bad week can't 500 the whole tick.
    console.error("[carrier-of-week] resolve error", e);
    return NextResponse.json({ ok: false, reason: "resolve_threw" }, { status: 200 });
  }
}

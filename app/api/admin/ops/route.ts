import { NextResponse } from "next/server";
import { adminKeyAuthed } from "@/lib/admin-auth";
import { opsSnapshot } from "@/lib/missions/ops-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OPS DASHBOARD (read-only) — today's run count, image count, estimated LLM
 * spend (USD), and the recent error feed. So the operator can SEE cost + failures
 * without waiting for the provider bill or a Discord report. Gated by
 * ADMIN_SEED_KEY (404 when unset).
 *
 *   curl "http://localhost:3000/api/admin/ops" -H "x-admin-key: KEY"
 */
export async function GET(req: Request) {
  const key = process.env.ADMIN_SEED_KEY;
  if (!key) return NextResponse.json({ error: "disabled" }, { status: 404 });
  if (!adminKeyAuthed(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const snap = await opsSnapshot();
  return NextResponse.json({
    ok: true,
    day: snap.day,
    runs: snap.runs,
    images: snap.images,
    estCostUsd: snap.estCostUsd,
    note: `Estimated LLM+image spend today: $${snap.estCostUsd.toFixed(2)} across ${snap.runs} runs + ${snap.images} images. Errors below are the most recent.`,
    recentErrors: snap.recentErrors,
  });
}

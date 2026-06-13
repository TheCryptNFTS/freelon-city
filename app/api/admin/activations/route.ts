import { NextResponse } from "next/server";
import { adminKeyAuthed } from "@/lib/admin-auth";
import { listActivations } from "@/lib/missions/unlock-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * READ-ONLY — the real paid-activation count + gross ETH from the unlock ledger
 * (freelon:unlock:v2:*). This is the app's own record of who paid to wake their
 * agent. Use it instead of asking an indexer each time. Writes nothing. Gated by
 * ADMIN_SEED_KEY (404 when unset, 403 on wrong key).
 */
export async function GET(req: Request) {
  const key = process.env.ADMIN_SEED_KEY;
  if (!key) return NextResponse.json({ error: "disabled" }, { status: 404 });
  if (!adminKeyAuthed(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const s = await listActivations();
  return NextResponse.json({
    ok: true,
    activatedCount: s.activatedCount,
    totalEthPaid: Number(s.totalEthPaid.toFixed(6)),
    recent: s.recent,
  });
}

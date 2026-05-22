import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { signalTransmission } from "@/lib/transmissions-store";
import { isSameOrigin, requireSessionBound } from "@/lib/x-session";
import { isValidAddress, getWalletBalanceVerified } from "@/lib/wallet-tokens";

export const dynamic = "force-dynamic";

/**
 * POST /api/transmissions/[id]/signal
 * Body: { addr }
 * Free 1-per-wallet upvote. Carrier-only.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await limit(req, "tx:signal", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { addr?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const addr = (body.addr || "").toLowerCase();
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!requireSessionBound(req, addr)) {
    return NextResponse.json({ error: "session_required" }, { status: 401 });
  }
  // Carrier-only — must hold ≥1 citizen
  const bal = await getWalletBalanceVerified(addr);
  if (bal === null) {
    return NextResponse.json({ error: "balance_unknown_retry" }, { status: 503 });
  }
  if (bal < 1) {
    return NextResponse.json({ error: "not_a_carrier" }, { status: 403 });
  }

  const { id } = await params;
  const r = await signalTransmission(id, addr);
  if (!r.ok) {
    if (r.alreadyVoted) {
      return NextResponse.json({ error: "already_signaled" }, { status: 409 });
    }
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    signals: r.t?.signals ?? 0,
    boostHex: r.t?.boostHex ?? 0,
  });
}

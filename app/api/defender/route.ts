/**
 * POST /api/defender
 * Body: { wallet, bidEth, evidenceUrl? }
 *
 * Records a defender bid claim. Verified asynchronously by the
 * founder (manual v1) or by an auto-scan against OpenSea offers
 * (planned v2). Hex is NOT credited here — only when verified.
 *
 * Rate-limited per IP. Same-origin only (uses HMAC X-session bind
 * to ensure the wallet matches the verified session).
 */
import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { isSameOrigin, requireSessionBound } from "@/lib/x-session";
import { isValidAddress } from "@/lib/wallet-tokens";
import { recordBid, getStats } from "@/lib/defender-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getStats();
  return NextResponse.json(stats);
}

export async function POST(req: Request) {
  const rl = await limit(req, "defender:post", { max: 10, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { wallet?: string; bidEth?: number; floorEth?: number; evidenceUrl?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const wallet = (body.wallet || "").toLowerCase();
  if (!isValidAddress(wallet)) {
    return NextResponse.json({ error: "invalid_wallet" }, { status: 400 });
  }
  if (!requireSessionBound(req, wallet)) {
    return NextResponse.json({ error: "session_required" }, { status: 401 });
  }
  const bidEth = Number(body.bidEth || 0);
  const floorEth = Number(body.floorEth || 0);
  if (!Number.isFinite(bidEth) || bidEth <= 0) {
    return NextResponse.json({ error: "invalid_bid" }, { status: 400 });
  }
  if (!Number.isFinite(floorEth) || floorEth <= 0) {
    return NextResponse.json({ error: "missing_floor" }, { status: 400 });
  }
  // Must be at least 1.4× floor to qualify
  if (bidEth < floorEth * 1.4) {
    return NextResponse.json({
      error: "bid_too_low",
      required: floorEth * 1.4,
      yourBid: bidEth,
    }, { status: 400 });
  }

  const evidenceUrl = (body.evidenceUrl || "").slice(0, 300);
  if (evidenceUrl && !/^https?:\/\//.test(evidenceUrl)) {
    return NextResponse.json({ error: "invalid_evidence_url" }, { status: 400 });
  }

  const rec = await recordBid({
    wallet,
    bidEth,
    floorEthAtBid: floorEth,
    evidenceUrl,
  });

  return NextResponse.json({
    ok: true,
    bid: rec,
    nextStep: "Bid recorded. The architect will verify on-chain and credit your hex within 24h. Hold the bid to qualify.",
  });
}

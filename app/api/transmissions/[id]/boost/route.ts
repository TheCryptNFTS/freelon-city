import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { boostTransmission, getTransmission } from "@/lib/transmissions-store";
import { isSameOrigin, requireSessionBound } from "@/lib/x-session";
import { isValidAddress } from "@/lib/wallet-tokens";
import { debitWalletHex, creditWalletHex, getWalletHex } from "@/lib/wallet-hex-store";

export const dynamic = "force-dynamic";

const MIN_BOOST = 10;
const MAX_BOOST = 5_000;

/**
 * POST /api/transmissions/[id]/boost
 * Body: { addr, hex }
 * Burns `hex` from the booster wallet, adds to the transmission's boostHex.
 * 90% of the burn is permanent (sink), 10% is credited to the author as
 * a "transmission royalty" — gives content creators a direct revenue line.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await limit(req, "tx:boost", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { addr?: string; hex?: number } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const addr = (body.addr || "").toLowerCase();
  const hex = Math.floor(Number(body.hex || 0));
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!Number.isFinite(hex) || hex < MIN_BOOST || hex > MAX_BOOST) {
    return NextResponse.json({ error: "invalid_amount", min: MIN_BOOST, max: MAX_BOOST }, { status: 400 });
  }
  if (!requireSessionBound(req, addr)) {
    return NextResponse.json({ error: "session_required" }, { status: 401 });
  }

  const { id } = await params;
  const t = await getTransmission(id);
  if (!t || t.status !== "live") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Don't allow self-boosting (creates a wash-trade hex laundromat)
  if (t.author === addr) {
    return NextResponse.json({ error: "cannot_boost_own" }, { status: 403 });
  }

  // Balance check
  const rec = await getWalletHex(addr);
  if (rec.balance < hex) {
    return NextResponse.json(
      { error: "insufficient_hex", required: hex, balance: rec.balance },
      { status: 402 },
    );
  }

  // Debit booster
  try {
    await debitWalletHex(addr, hex, {
      kind: "manual",
      note: `Boost · transmission ${id.slice(0, 8)} · +${hex}⬡`,
    });
  } catch {
    return NextResponse.json({ error: "debit_failed" }, { status: 402 });
  }

  // Credit 10% to author as royalty
  const royalty = Math.floor(hex * 0.1);
  if (royalty > 0) {
    try {
      await creditWalletHex(t.author, royalty, {
        kind: "manual",
        note: `Transmission royalty · ${id.slice(0, 8)} · +${royalty}⬡`,
      });
      // Fire-and-forget notification so the author sees the boost next
      // visit (and gets a DM if they opted in). Dedupe per boost event.
      const { notify } = await import("@/lib/notify");
      void notify({
        wallet: t.author,
        eventKey: `transmission-boost:${id}:${addr}:${Date.now()}`,
        kind: "transmission-boosted",
        body: `🔥 Your transmission got boosted +${hex} ⬡ · you earned +${royalty} ⬡ royalty.`,
        href: `/transmissions/${id}`,
      }).catch(() => {});
    } catch {/* non-fatal; the boost still counts toward score */}
  }

  // Bump score
  const r = await boostTransmission(id, addr, hex);
  return NextResponse.json({
    ok: true,
    burned: hex,
    royaltyToAuthor: royalty,
    boostHex: r.t?.boostHex ?? 0,
    signals: r.t?.signals ?? 0,
  });
}

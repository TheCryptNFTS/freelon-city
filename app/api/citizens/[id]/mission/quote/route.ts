import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCitizen } from "@/lib/citizens";
import { getMission } from "@/lib/missions";
import { verifyOwnership } from "@/lib/owner-of";
import { createQuote } from "@/lib/payments/orders";
import { PAYMENTS_LIVE, priceUsdFor } from "@/lib/missions/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { missionId, address, signature } → an exact ETH amount to send to the
// project wallet. Owner-gated: only the citizen's owner can get a quote, and
// the quote is bound to THAT wallet (so payment is matched on sender).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "mission:quote", { max: 12, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { isSameOrigin, getSessionFromRequest } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040 || !getCitizen(cid)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { missionId?: string; address?: string; signature?: string };
  const mission = getMission((body.missionId ?? "").trim());
  if (!mission) return NextResponse.json({ error: "unknown_mission" }, { status: 400 });
  if (priceUsdFor(mission.id) <= 0) return NextResponse.json({ error: "free_mission" }, { status: 400 });
  if (!PAYMENTS_LIVE) return NextResponse.json({ error: "payments_not_live" }, { status: 409 });

  // Auth: bound session OR wallet signature (same pattern as the mission run).
  let wallet: string | null = null;
  const session = getSessionFromRequest(req);
  if (session && /^0x[a-f0-9]{40}$/.test((session.bind || "").toLowerCase())) {
    wallet = session.bind.toLowerCase();
  } else if (body.address && body.signature) {
    const address = body.address.toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) return NextResponse.json({ error: "invalid address" }, { status: 400 });
    const message = `I am paying to deploy FREELON CITY citizen #${cid} on mission "${mission.id}".`;
    let ok = false;
    try { ok = await verifyMessage({ address: address as `0x${string}`, message, signature: body.signature as `0x${string}` }); } catch { ok = false; }
    if (!ok) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
    wallet = address;
  }
  if (!wallet) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  // Must own the citizen to buy a mission for it.
  const verdict = await verifyOwnership(cid, wallet);
  if (verdict.status === "unknown") return NextResponse.json({ error: "ownership_unverified" }, { status: 503 });
  if (verdict.status === "not-owner") return NextResponse.json({ error: "not_owner" }, { status: 403 });

  const quote = await createQuote({ wallet, citizenId: cid, missionId: mission.id });
  if ("error" in quote) return NextResponse.json({ error: quote.error }, { status: 502 });

  return NextResponse.json({
    ok: true,
    missionId: mission.id,
    usd: quote.usd,
    amountEth: quote.ethLabel,
    amountWei: quote.wei,
    toWallet: quote.toWallet,
    expiresAt: quote.expiresAt,
    instructions: `Send exactly ${quote.ethLabel} ETH from your wallet to ${quote.toWallet}, then submit the transaction hash to run the mission.`,
  });
}

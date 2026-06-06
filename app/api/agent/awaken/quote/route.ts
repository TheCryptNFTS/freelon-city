import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCitizen } from "@/lib/citizens";
import { verifyOwnership } from "@/lib/owner-of";
import { createAwakenQuote } from "@/lib/payments/awaken-orders";
import { awakenTier } from "@/lib/economy-constants";
import { PAYMENTS_LIVE } from "@/lib/missions/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/agent/awaken/quote  body { tokenId, tier }
 * Owner-gated. Returns an exact-ETH quote to send to the project wallet to
 * awaken this agent at the chosen tier. The quote is bound to the OWNER wallet
 * so payment is matched on sender + exact amount (the safe-attribution model).
 *
 * Response: { quoteId, to, valueWei, eth, expiresAt }
 */
export async function POST(req: Request) {
  const rl = await limit(req, "agent:awaken:quote", { max: 12, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { isSameOrigin, getSessionFromRequest } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    tokenId?: number | string;
    tier?: string;
    address?: string;
    signature?: string;
  };

  const cid = parseInt(String(body.tokenId ?? ""), 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040 || !getCitizen(cid)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const tier = awakenTier((body.tier ?? "").trim());
  if (!tier) return NextResponse.json({ error: "unknown_tier" }, { status: 400 });
  if (!PAYMENTS_LIVE) return NextResponse.json({ error: "payments_not_live" }, { status: 409 });

  // Auth: bound session OR wallet signature (same pattern as the unlock rail).
  let wallet: string | null = null;
  const session = getSessionFromRequest(req);
  if (session && /^0x[a-f0-9]{40}$/.test((session.bind || "").toLowerCase())) {
    wallet = session.bind.toLowerCase();
  } else if (body.address && body.signature) {
    const address = body.address.toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) return NextResponse.json({ error: "invalid address" }, { status: 400 });
    const message = `I am awakening FREELON CITY agent #${cid} at the ${tier.key} tier.`;
    let ok = false;
    try { ok = await verifyMessage({ address: address as `0x${string}`, message, signature: body.signature as `0x${string}` }); } catch { ok = false; }
    if (!ok) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
    wallet = address;
  }
  if (!wallet) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  // Must own the citizen to awaken it.
  const verdict = await verifyOwnership(cid, wallet);
  if (verdict.status === "unknown") return NextResponse.json({ error: "ownership_unverified" }, { status: 503 });
  if (verdict.status === "not-owner") return NextResponse.json({ error: "not_owner" }, { status: 403 });

  const quote = await createAwakenQuote({ wallet, tokenId: cid, tierKey: tier.key });
  if ("error" in quote) return NextResponse.json({ error: quote.error }, { status: 502 });

  return NextResponse.json({
    quoteId: quote.quoteId,
    to: quote.toWallet,
    valueWei: quote.wei,
    eth: quote.ethLabel,
    expiresAt: quote.expiresAt,
  });
}

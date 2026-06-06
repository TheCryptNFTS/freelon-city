import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCitizen } from "@/lib/citizens";
import { verifyOwnership } from "@/lib/owner-of";
import { verifyAwakenPayment } from "@/lib/payments/awaken-orders";
import { recordAwaken } from "@/lib/agent-tier-store";
import { addCitizenMemory } from "@/lib/progression-store";
import { awakenTier } from "@/lib/economy-constants";
import { PAYMENTS_LIVE } from "@/lib/missions/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/agent/awaken/confirm  body { tokenId, tier, txHash }
 * Owner-gated. Verifies the ETH payment on-chain (sender==owner, exact wei to
 * the project wallet, tx success, confirmations) via verifyAwakenPayment, dedupes
 * by txHash so one tx can't awaken twice, then marks the citizen AWAKENED in the
 * off-chain agent-tier store and logs a progression memory entry.
 *
 * Off-chain only: no project key is on the server, so we do NOT call
 * recordEvolution here — the ETH tx hash + block IS the verifiable anchor; the
 * admin batch handles any later on-chain write.
 *
 * Response (success): { ok: true, awakened: true, tier, awakenedAt, block, txHash }
 */
export async function POST(req: Request) {
  const rl = await limit(req, "agent:awaken:confirm", { max: 12, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { isSameOrigin, getSessionFromRequest } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    tokenId?: number | string;
    tier?: string;
    txHash?: string;
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

  const txHash = typeof body.txHash === "string" ? body.txHash.trim() : "";
  if (!txHash) return NextResponse.json({ error: "payment_required" }, { status: 402 });

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

  const verdict = await verifyOwnership(cid, wallet);
  if (verdict.status === "unknown") return NextResponse.json({ error: "ownership_unverified" }, { status: 503 });
  if (verdict.status === "not-owner") return NextResponse.json({ error: "not_owner" }, { status: 403 });

  // Verify + dedupe the ETH payment. Same retry semantics as the unlock route:
  // unmined / not-yet-confirmed → retryable (425); a hard failure → 402. Awaken
  // state is NOT touched on any failure.
  const v = await verifyAwakenPayment({ wallet, tokenId: cid, tierKey: tier.key, txHash });
  if (!v.ok) {
    const retry = v.error === "awaiting_confirmations" || v.error === "tx_not_found_yet";
    return NextResponse.json({ error: v.error }, { status: retry ? 425 : 402 });
  }

  const rec = await recordAwaken({
    tokenId: cid,
    awakenTier: v.order.tierNum,
    awakenedAt: Date.now(),
    awakenBlock: v.block,
    paidWei: v.order.wei,
  });

  // Append a progression memory entry (the citizen's public record). Non-fatal:
  // the awaken already stuck (tx deduped), so a failed log must not 500 the call.
  await addCitizenMemory(cid, {
    type: "mission",
    description: `Awakened (${tier.label}) on Ethereum · block ${v.block}`,
    xpChange: 0,
    signalChange: 0,
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    awakened: true,
    tier: tier.key,
    awakenedAt: rec.awakenedAt,
    block: v.block,
    txHash,
  });
}

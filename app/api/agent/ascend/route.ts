import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { getCitizen } from "@/lib/citizens";
import { normalizeHandle } from "@/lib/sync";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { ASCENSION_TIERS, ascensionCost } from "@/lib/economy-constants";
import { getXVerification } from "@/lib/x-store";
import { verifyOwnership } from "@/lib/owner-of";
import { foldCarrierIntoWallet } from "@/lib/hex-spend";
import { creditWalletHex, debitWalletHex, getWalletHex, InsufficientHexError } from "@/lib/wallet-hex-store";
import { getAgentRecord, agentRegistryAddress } from "@/lib/onchain/agent-registry";
import { recordAscension, getTier } from "@/lib/agent-tier-store";
import { addCitizenMemory } from "@/lib/progression-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/agent/ascend — ASCENSION, the agent training sink.
 *
 * A holder BURNS ⬡ to advance an awakened citizen's agent tier. This is a pure
 * HEX SINK (deflation) — it NEVER charges ETH and is independent of
 * PAYMENTS_LIVE (house rule: training is a burn, not a real-money charge).
 *
 * Auth mirrors /api/realign: same-origin + wallet signature (verifyMessage) +
 * multi-source ownership (verifyOwnership) + handle-to-wallet bind check, so the
 * burning wallet is signature-proven to own the citizen.
 *
 * Registry-not-deployed safe: if the citizen is awakened on-chain we require
 * the next tier to follow its current one; if the registry isn't live yet we
 * STILL allow the burn and queue the tier as pending (the admin /evolve batch
 * anchors it later). The on-chain evolution never blocks training.
 *
 * Refund-on-failure: if recording the pending tier fails after the burn, the ⬡
 * is credited straight back (mirrors the mission flow).
 */
export async function POST(req: Request) {
  const rl = await limit(req, "agent-ascend", { max: 6, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  // CSRF: same-origin only. Wallet auth is enforced below via signature.
  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    tokenId?: number;
    tier?: number;
    address?: string;
    signature?: string;
    handle?: string;
  };

  const tokenId = Math.floor(Number(body.tokenId));
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) {
    return NextResponse.json({ error: "invalid tokenId" }, { status: 400 });
  }
  const citizen = getCitizen(tokenId);
  if (!citizen) return NextResponse.json({ error: "citizen not found" }, { status: 404 });

  const targetTier = Math.floor(Number(body.tier));
  if (!Number.isInteger(targetTier) || targetTier < 1 || targetTier > ASCENSION_TIERS.length) {
    return NextResponse.json({ error: "invalid tier", min: 1, max: ASCENSION_TIERS.length }, { status: 400 });
  }

  const address = body.address?.toLowerCase();
  const signature = body.signature;
  const handle = normalizeHandle(body.handle ?? "");
  if (!address || !signature) {
    return NextResponse.json({ error: "address + signature required" }, { status: 400 });
  }
  if (!handle) {
    return NextResponse.json({ error: "carrier handle required" }, { status: 400 });
  }

  // Signature gate — the message names the action, citizen, and target tier.
  const message = `I am ascending FREELON CITY agent #${tokenId} to tier ${targetTier}.`;
  let sigOk = false;
  try {
    sigOk = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    sigOk = false;
  }
  if (!sigOk) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });

  // Multi-source ownership check (see lib/owner-of.ts) — avoids the false
  // negative when public RPCs throttle.
  const verdict = await verifyOwnership(tokenId, address);
  if (verdict.status === "unknown") {
    return NextResponse.json(
      { error: "⬡ SIGNAL DISRUPTED · the city couldn't read your chain credentials · retry" },
      { status: 503 },
    );
  }
  if (verdict.status === "not-owner") {
    return NextResponse.json({ error: "you do not own this citizen" }, { status: 403 });
  }

  // Bind check: the handle being spent against MUST be the X handle the signing
  // wallet verified — otherwise an attacker could submit their own valid sig
  // with a victim's handle.
  const verification = await getXVerification(address);
  if (!verification || normalizeHandle(verification.xHandle) !== handle) {
    return NextResponse.json({ error: "handle not verified to this wallet" }, { status: 403 });
  }

  // Awakened gate. When the registry is LIVE we require the citizen to be
  // awakened and the target tier to be the next step above its anchored tier.
  // When the registry is NOT live yet we allow training to proceed (queued),
  // so deployment never blocks the burn.
  const registryLive = agentRegistryAddress() !== null;
  const record = await getAgentRecord(tokenId);
  const pending = await getTier(tokenId);
  const currentTier = Math.max(record?.tier ?? 0, pending.tier);

  if (registryLive && !record) {
    return NextResponse.json(
      { error: "not awakened", message: "Awaken this citizen before training it." },
      { status: 409 },
    );
  }
  // Tiers must be taken in order, and never re-bought.
  if (targetTier <= currentTier) {
    return NextResponse.json(
      { error: "already at or above this tier", currentTier },
      { status: 409 },
    );
  }
  if (targetTier !== currentTier + 1) {
    return NextResponse.json(
      { error: "tiers must be ascended in order", currentTier, nextTier: currentTier + 1 },
      { status: 409 },
    );
  }

  const cost = ascensionCost(targetTier);
  if (cost <= 0) {
    return NextResponse.json({ error: "invalid tier" }, { status: 400 });
  }

  // Fold any leftover carrier-hex into the wallet first (idempotent), then BURN
  // the cost from the signature-proven wallet ledger.
  await foldCarrierIntoWallet(handle, address);
  try {
    await debitWalletHex(address, cost, {
      kind: "manual",
      note: `Ascend #${tokenId} → tier ${targetTier} (−${cost}⬡)`,
    });
  } catch (e) {
    if (e instanceof InsufficientHexError) {
      return NextResponse.json(
        { error: "insufficient hex points", required: e.requested, have: e.balance },
        { status: 402 },
      );
    }
    throw e;
  }

  // Record the paid tier as pending (the admin /evolve batch anchors it later).
  // If this fails after the burn, refund the ⬡ — never charge for a no-op.
  try {
    await recordAscension(tokenId, targetTier, cost);
  } catch {
    await creditWalletHex(address, cost, {
      kind: "manual",
      note: `Refund: ascend #${tokenId} tier ${targetTier} failed`,
    }).catch(() => {});
    return NextResponse.json(
      { error: "ascension_failed", message: "Training didn't record — your ⬡ was refunded." },
      { status: 500 },
    );
  }

  // Append a memory-log entry to progression (the citizen's public record). The
  // burn shows as a negative signalChange. Non-fatal — the burn already stuck.
  await addCitizenMemory(tokenId, {
    type: "mission",
    description: `Ascended to agent tier ${targetTier}${registryLive ? "" : " (anchor queued)"}`,
    xpChange: 0,
    signalChange: -cost,
  }).catch(() => {});

  const wrec = await getWalletHex(address);
  return NextResponse.json({
    ok: true,
    tokenId,
    tier: targetTier,
    cost,
    walletBalance: wrec.balance,
    // True once the registry is live and the admin batch has anchored this tier.
    anchored: (record?.tier ?? 0) >= targetTier,
    queued: !registryLive || (record?.tier ?? 0) < targetTier,
    registryLive,
  });
}

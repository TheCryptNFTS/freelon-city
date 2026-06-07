import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { getCitizen } from "@/lib/citizens";
import { normalizeHandle } from "@/lib/sync";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { EVOLVE_MAX_TIER, evolveCost, evolveLevelGate } from "@/lib/economy-constants";
import { getXVerification } from "@/lib/x-store";
import { verifyOwnership } from "@/lib/owner-of";
import { foldCarrierIntoWallet } from "@/lib/hex-spend";
import { creditWalletHex, debitWalletHex, getWalletHex, InsufficientHexError } from "@/lib/wallet-hex-store";
import { isUnlocked } from "@/lib/missions/unlock-store";
import { getProgress, addCitizenMemory } from "@/lib/progression-store";
import { getEvolution, setEvolved } from "@/lib/evolution-store";
import { generateEvolvedArt } from "@/lib/missions/image-gen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Produces a high-quality gpt-image-1.5 render (slow). Without this the function
// is killed long before the render returns. 300s = Vercel Pro max.
export const maxDuration = 300;

/**
 * POST /api/agent/evolve — EVOLVE a citizen's DISPLAYED art (opt-in, revertable).
 *
 * A holder BURNS ⬡ to render an on-brand UPGRADE of their citizen's own art and
 * have it served as the citizen's `image` via the dynamic metadata route. This
 * is ADDITIVE + REVERTABLE: the original anchored art is never touched and the
 * holder can revert at any time (POST /api/agent/evolve/revert). Like ASCENSION
 * this is a pure HEX SINK — never an ETH/real-money charge.
 *
 * Auth mirrors /api/agent/ascend EXACTLY: same-origin + wallet signature
 * (verifyMessage) + multi-source ownership (verifyOwnership) + handle→wallet
 * bind check.
 *
 * Gate: the citizen must be UNLOCKED (awakened agent) AND its progression level
 * must meet the gate for the target evolve tier AND the target must be the next
 * tier in order (never skip / re-buy).
 *
 * Provider-guard: if OPENAI_API_KEY is missing we 503 BEFORE charging ⬡.
 * Refund-on-failure: if the render or the store write fails after the burn, the
 * ⬡ is credited straight back (mirrors the mission/ascend flow).
 */
export async function POST(req: Request) {
  const rl = await limit(req, "agent-evolve", { max: 4, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  // Feature flag — parked as "coming soon" until the on-chain metadata migration
  // (setBaseURI) is done. Refuse BEFORE any auth/charge/render so no ⬡ can be
  // spent and no image rendered while the feature is off. Flip EVOLVE_LIVE=true.
  if (process.env.EVOLVE_LIVE !== "true") {
    return NextResponse.json(
      { error: "coming_soon", message: "Art evolution is coming soon." },
      { status: 410 },
    );
  }

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
  if (!Number.isInteger(targetTier) || targetTier < 1 || targetTier > EVOLVE_MAX_TIER) {
    return NextResponse.json({ error: "invalid tier", min: 1, max: EVOLVE_MAX_TIER }, { status: 400 });
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

  // Provider-guard BEFORE any auth/charge work: no renderer → no evolve. 503 so
  // the client knows to retry, and the holder is never charged for a no-op.
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "renderer_unavailable", message: "The evolve renderer is offline — try again shortly." },
      { status: 503 },
    );
  }

  // Signature gate — the message names the action, citizen, and target tier.
  const message = `I am evolving FREELON CITY agent #${tokenId} to evolve tier ${targetTier}.`;
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

  // Multi-source ownership check (avoids the false negative when public RPCs throttle).
  const verdict = await verifyOwnership(tokenId, address);
  if (verdict.status === "unknown") {
    return NextResponse.json(
      { error: "⬡ SIGNAL WEAK · couldn't reach the chain just now · wait a moment and retry. Your ownership is safe on-chain." },
      { status: 503 },
    );
  }
  if (verdict.status === "not-owner") {
    return NextResponse.json({ error: "you do not own this citizen" }, { status: 403 });
  }

  // Bind check: the handle spent against MUST be the X handle the signing wallet
  // verified — otherwise an attacker could submit a valid sig with a victim handle.
  const verification = await getXVerification(address);
  if (!verification || normalizeHandle(verification.xHandle) !== handle) {
    return NextResponse.json({ error: "handle not verified to this wallet" }, { status: 403 });
  }

  // Unlock gate — the citizen must be an awakened agent before its art evolves.
  if (!(await isUnlocked(tokenId))) {
    return NextResponse.json(
      { error: "not awakened", message: "Awaken this citizen before evolving its art." },
      { status: 409 },
    );
  }

  // Tier gate — must take tiers in order, never re-buy, never skip.
  const evo = await getEvolution(tokenId);
  const currentTier = evo.tier;
  if (targetTier <= currentTier) {
    return NextResponse.json({ error: "already at or above this evolve tier", currentTier }, { status: 409 });
  }
  if (targetTier !== currentTier + 1) {
    return NextResponse.json(
      { error: "evolve tiers must be taken in order", currentTier, nextTier: currentTier + 1 },
      { status: 409 },
    );
  }

  // Level gate — evolution tracks training; the citizen must have leveled enough.
  const progress = await getProgress(tokenId);
  const levelGate = evolveLevelGate(targetTier);
  if (progress.level < levelGate) {
    return NextResponse.json(
      { error: "level gate not met", required: levelGate, level: progress.level },
      { status: 409 },
    );
  }

  const cost = evolveCost(targetTier);
  if (cost <= 0) {
    return NextResponse.json({ error: "invalid tier" }, { status: 400 });
  }

  // Fold any leftover carrier-hex into the wallet first (idempotent), then BURN
  // the cost from the signature-proven wallet ledger.
  await foldCarrierIntoWallet(handle, address);
  try {
    await debitWalletHex(address, cost, {
      kind: "manual",
      note: `Evolve #${tokenId} → tier ${targetTier} (−${cost}⬡)`,
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

  // Refund helper — credit the ⬡ straight back on any post-burn failure so we
  // never charge for a no-op (mirrors the mission/ascend flow).
  const refund = async (note: string) => {
    await creditWalletHex(address, cost, { kind: "manual", note }).catch(() => {});
  };

  // Render the evolved art via the existing image pipeline (tier-scaled upgrade).
  const render = await generateEvolvedArt({ citizen, tier: targetTier });
  if (!render.ok) {
    await refund(`Refund: evolve #${tokenId} tier ${targetTier} render failed`);
    import("@/lib/missions/ops-log")
      .then((m) => m.recordError(`evolve:t${targetTier}`, new Error(render.error || "unknown"), { tokenId }))
      .catch(() => {});
    return NextResponse.json(
      {
        error: "evolve_render_failed",
        message:
          render.error === "timeout"
            ? "The render timed out — your ⬡ was refunded. Try again."
            : `The render didn't complete (${render.error || "unknown"}) — your ⬡ was refunded.`,
      },
      { status: 502 },
    );
  }

  // Persist the override. If this fails after a successful render+burn, refund.
  try {
    await setEvolved(tokenId, targetTier, render.url);
  } catch {
    await refund(`Refund: evolve #${tokenId} tier ${targetTier} store write failed`);
    return NextResponse.json(
      { error: "evolve_failed", message: "Evolution didn't record — your ⬡ was refunded." },
      { status: 500 },
    );
  }

  // Append a memory-log entry (the citizen's public record). The burn shows as a
  // negative signalChange. Non-fatal — the evolve already stuck.
  await addCitizenMemory(tokenId, {
    type: "mission",
    description: `Evolved art to tier ${targetTier}`,
    xpChange: 0,
    signalChange: -cost,
  }).catch(() => {});

  const wrec = await getWalletHex(address);
  return NextResponse.json({
    ok: true,
    evolved: true,
    tokenId,
    tier: targetTier,
    cost,
    evolvedImageUrl: render.url,
    walletBalance: wrec.balance,
  });
}

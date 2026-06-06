/**
 * GET /api/agent/evolve/status?tokenId= — public read of a citizen's EVOLUTION
 * state + whether it CAN evolve next.
 *
 * canEvolve is true iff: the citizen is UNLOCKED (activated agent) AND its
 * progression LEVEL meets the gate for the NEXT evolve tier AND it is not
 * already at the max evolve tier. `reason` explains a false so the UI can guide
 * the holder (awaken / train / maxed).
 *
 * Read-only, no auth — like other status endpoints. Ownership is only required
 * to actually evolve (POST /api/agent/evolve), not to read public state.
 */

import { NextResponse } from "next/server";
import { getEvolution } from "@/lib/evolution-store";
import { isUnlocked } from "@/lib/missions/unlock-store";
import { getProgress } from "@/lib/progression-store";
import { EVOLVE_MAX_TIER, evolveLevelGate, evolveCost } from "@/lib/economy-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenId = Math.floor(Number(url.searchParams.get("tokenId")));
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) {
    return NextResponse.json({ error: "invalid tokenId" }, { status: 400 });
  }

  // Feature flag — art evolution is parked as "coming soon" until the on-chain
  // metadata migration (setBaseURI) is done. Flip EVOLVE_LIVE=true to turn it on.
  if (process.env.EVOLVE_LIVE !== "true") {
    return NextResponse.json({
      tokenId,
      comingSoon: true,
      canEvolve: false,
      evolved: false,
      tier: 0,
      reason: "Art evolution is coming soon.",
    });
  }

  const [evo, unlocked, progress] = await Promise.all([
    getEvolution(tokenId),
    isUnlocked(tokenId),
    getProgress(tokenId),
  ]);

  const nextTier = evo.tier + 1;
  const atMax = evo.tier >= EVOLVE_MAX_TIER;
  const levelGate = atMax ? Infinity : evolveLevelGate(nextTier);
  const meetsLevel = progress.level >= levelGate;

  let canEvolve = false;
  let reason = "";
  if (atMax) {
    reason = "already at max evolve tier";
  } else if (!unlocked) {
    reason = "awaken this citizen before evolving its art";
  } else if (!meetsLevel) {
    reason = `reach level ${levelGate} to evolve to tier ${nextTier}`;
  } else {
    canEvolve = true;
  }

  return NextResponse.json({
    tokenId,
    evolved: evo.evolved,
    tier: evo.tier,
    evolvedImageUrl: evo.evolvedImageUrl,
    canEvolve,
    nextTier: atMax ? null : nextTier,
    nextTierCost: atMax ? null : evolveCost(nextTier),
    nextTierLevelGate: atMax ? null : levelGate,
    level: progress.level,
    unlocked,
    maxTier: EVOLVE_MAX_TIER,
    reason,
  });
}

import { limit, tooManyResponse } from "@/lib/rate-limit";
import { publicJson, publicOptions, publicCors, parseTokenId } from "@/lib/public-api";
import { getAgentRecord, agentRegistryAddress } from "@/lib/onchain/agent-registry";
import { getTier } from "@/lib/agent-tier-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/citizens/:id/agent
 * Public, read-only on-chain AGENT identity for a citizen: whether it's been
 * awakened in FreelonAgentRegistry, its anchored tier, and the off-chain
 * pending tier the holder has paid (⬡-burned) for ahead of the next on-chain
 * recordEvolution.
 *
 * Degrades gracefully: the registry is NOT deployed yet, so when
 * AGENT_REGISTRY_ADDRESS is unset getAgentRecord returns null — we report
 * `{ awakened: false, registryLive: false }` rather than erroring, and surface
 * any locally-queued tier so the UI can still show training state.
 */
export async function OPTIONS() {
  return publicOptions();
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "v1-citizen-agent", { max: 120, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { id } = await ctx.params;
  const tokenId = parseTokenId(id);
  if (tokenId === null) {
    return NextResponse.json({ error: "tokenId must be 1..4040" }, { status: 400, headers: publicCors() });
  }

  const registryLive = agentRegistryAddress() !== null;
  const record = await getAgentRecord(tokenId);
  // Pending/paid tier from the off-chain queue (training burns recorded before
  // the on-chain evolution is anchored). Fail-quiet to a zeroed record.
  const pending = await getTier(tokenId).catch(() => null);

  // Off-chain AWAKEN state (ETH-paid activation). Independent of the on-chain
  // registry record — the awaken ETH tx hash + block is the verifiable anchor.
  // `awakenedAt` here is epoch MS (vs the registry's unix seconds).
  const offchainAwaken = {
    awakened: pending?.awakened ?? false,
    awakenTier: pending?.awakenTier ?? 0,
    awakenedAt: pending?.awakenedAt ?? 0,
  };

  if (!record) {
    // Not awakened on-chain (or registry not deployed). Still report any paid
    // tier the holder has queued AND the off-chain ETH-awaken state so the
    // dashboard reflects their spend. `awakened` reflects the ETH awaken here
    // since there is no on-chain record.
    return publicJson({
      tokenId,
      registryLive,
      tier: 0,
      pendingTier: pending?.tier ?? 0,
      hexBurned: pending?.hexBurned ?? 0,
      // awakened / awakenTier / awakenedAt come from the off-chain ETH awaken.
      ...offchainAwaken,
    });
  }

  return publicJson({
    ...record,
    tokenId,
    registryLive,
    // Awakened if EITHER the registry says so or the holder paid ETH off-chain.
    awakened: record.awakened || offchainAwaken.awakened,
    // The off-chain paid (training) tier may run ahead of the on-chain `tier`.
    pendingTier: Math.max(record.tier, pending?.tier ?? 0),
    hexBurned: pending?.hexBurned ?? 0,
    // Distinct off-chain ETH-awaken fields (separate from the registry `tier`/
    // `awakenedAt` carried by the spread record).
    awakenTier: offchainAwaken.awakenTier,
    awakenedAt: offchainAwaken.awakenedAt,
  });
}

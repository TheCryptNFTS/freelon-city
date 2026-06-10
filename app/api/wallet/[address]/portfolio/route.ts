import { NextResponse } from "next/server";
import { getWalletTokens } from "@/lib/wallet-tokens";
import { listActivatedTokenIds, getUnlock } from "@/lib/missions/unlock-store";
import { bulkLife } from "@/lib/progression-store";
import { getCitizen, civilizationColor } from "@/lib/citizens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Holder portfolio: every citizen this wallet owns, and for each one whether
 * it's ACTIVATED (the agent is switched on) and how many premium runs it has
 * left. Answers the whale's question — "which of my 115 have I unlocked / put
 * to work?" — in ONE call instead of opening each citizen.
 *
 * Cost is bounded: one SCAN for the activated set, then a getUnlock ONLY for
 * the owned∩activated tokens (usually a handful), never per-owned-token.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const tokens = await getWalletTokens(address, 200);
  if (!tokens) {
    return NextResponse.json({ error: "invalid-address", tokenIds: [], unlocked: {} }, { status: 400 });
  }

  // Life (level/jobs) rides along in two bulk ZMSCOREs — it answers the other
  // half of the whale's question: "which ones have I put to WORK?"
  const [activated, life] = await Promise.all([
    listActivatedTokenIds().catch(() => new Set<number>()),
    bulkLife(tokens.tokenIds),
  ]);
  const ownedActivated = tokens.tokenIds.filter((id) => activated.has(id));

  // Runs-left per activated citizen (bounded by # owned+activated).
  const unlocked: Record<number, { credits: number; tier: string }> = {};
  await Promise.all(
    ownedActivated.map(async (id) => {
      const rec = await getUnlock(id).catch(() => null);
      if (rec?.activated) unlocked[id] = { credits: rec.credits ?? 0, tier: rec.tier };
    }),
  );

  // Light per-token meta so the client doesn't import the 4040-entry citizen
  // JSON. name/tier/civ + civ color are all the grid needs.
  const citizens = tokens.tokenIds.map((id) => {
    const c = getCitizen(id);
    return {
      id,
      name: c?.transmission_name || c?.honoree || `Citizen #${String(id).padStart(4, "0")}`,
      tier: c?.tier ?? "Common",
      civ: c?.civilization ?? "",
      color: civilizationColor(c?.civilization ?? ""),
    };
  });

  return NextResponse.json({
    address: tokens.address,
    balance: tokens.balance,
    truncated: tokens.truncated,
    citizens, // [{ id, name, tier, civ, color }]
    unlocked, // { [tokenId]: { credits, tier } } — present only for activated agents
    unlockedCount: Object.keys(unlocked).length,
    life, // { [tokenId]: { level, jobs } } — present only for citizens with progression
  });
}

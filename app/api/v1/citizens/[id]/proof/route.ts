import { limit, tooManyResponse } from "@/lib/rate-limit";
import { publicJson, publicOptions, publicCors, parseTokenId } from "@/lib/public-api";
import { verifyCitizen } from "@/lib/onchain/anchor-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/citizens/:id/proof
 * The on-chain-anchored Merkle proof for this agent's work-history. Anyone can
 * verify the proof against the anchored root (off-chain, or via the registry
 * contract's verify()). `current` = whether the live record still matches what
 * was last anchored (false once the agent has worked since the last anchor).
 *
 * Wording note: this makes history ANCHORED / VERIFIABLE, not "immutable".
 */
export async function OPTIONS() {
  return publicOptions();
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "v1-proof", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { id } = await ctx.params;
  const tokenId = parseTokenId(id);
  if (tokenId === null) {
    return NextResponse.json({ error: "tokenId must be 1..4040" }, { status: 400, headers: publicCors() });
  }

  const proof = await verifyCitizen(tokenId);
  return publicJson({ tokenId, ...proof });
}

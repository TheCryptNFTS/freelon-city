import { limit, tooManyResponse } from "@/lib/rate-limit";
import { publicJson, publicOptions, publicCors } from "@/lib/public-api";
import { getWalletTokens, isValidAddress } from "@/lib/wallet-tokens";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/citizens?owner=0x...
 * The agent roster held by a wallet (token ids + balance). Public on-chain data.
 */
export async function OPTIONS() {
  return publicOptions();
}

export async function GET(req: Request) {
  const rl = await limit(req, "v1-roster", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const url = new URL(req.url);
  const owner = url.searchParams.get("owner") || "";
  if (!isValidAddress(owner)) {
    return NextResponse.json(
      { error: "owner must be a valid 0x address" },
      { status: 400, headers: publicCors() },
    );
  }

  const tokens = await getWalletTokens(owner);
  if (!tokens) {
    return NextResponse.json({ error: "invalid address" }, { status: 400, headers: publicCors() });
  }

  return publicJson({
    owner: tokens.address,
    balance: tokens.balance,
    tokenIds: tokens.tokenIds,
    truncated: tokens.truncated,
  });
}

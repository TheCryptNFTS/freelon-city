import { NextResponse } from "next/server";
import { getWalletTokens } from "@/lib/wallet-tokens";
import citizensData from "@/data/citizens.json";

export const revalidate = 300;

type Citizen = { id: number; civilization: string };
const CITIZEN_CIV: Record<number, string> = {};
for (const c of citizensData as Citizen[]) CITIZEN_CIV[c.id] = c.civilization;

// Holdings only — deliberately NO floor/ETH valuation. This endpoint used to
// return floor×count as a portfolio "net worth"; pricing a wallet's holdings
// against the secondary floor is the implied-equity framing we don't ship.
// Callers only need the citizen count + per-civ split.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const tokens = await getWalletTokens(address);
  if (!tokens) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  // Bucket the wallet's tokens by civilization
  const byCiv: Record<string, number[]> = {};
  for (const tid of tokens.tokenIds) {
    const civ = CITIZEN_CIV[tid] || "unknown";
    (byCiv[civ] ||= []).push(tid);
  }

  const civBreakdown = Object.entries(byCiv)
    .map(([civ, ids]) => ({ civ, count: ids.length }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    address: tokens.address,
    balance: tokens.balance,
    tokenIds: tokens.tokenIds,
    truncated: tokens.truncated,
    civs: civBreakdown,
  });
}

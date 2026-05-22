import { NextResponse } from "next/server";
import { isValidAddress, getWalletTokens } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { CIVILIZATIONS } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

export const revalidate = 300;

const ID_TO_CIV = new Map<number, string>();
for (const c of citizensData as Array<{ id: number; civilization: string }>) {
  ID_TO_CIV.set(c.id, c.civilization);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const rl = await limit(req, "wallet:civs", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { address } = await params;
  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  const tokens = await getWalletTokens(address, 500);
  if (!tokens) return NextResponse.json({ breakdown: [], balance: 0 });

  const counts = new Map<string, number>();
  for (const tid of tokens.tokenIds) {
    const civ = ID_TO_CIV.get(tid);
    if (!civ) continue;
    counts.set(civ, (counts.get(civ) || 0) + 1);
  }

  const breakdown = [...counts.entries()]
    .map(([slug, count]) => ({
      slug,
      name: (CIVILIZATIONS as Record<string, { name: string; color: string }>)[slug]?.name ?? slug,
      color: (CIVILIZATIONS as Record<string, { name: string; color: string }>)[slug]?.color ?? "#777",
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ breakdown, balance: tokens.balance });
}

import { NextResponse } from "next/server";
import { getWalletTokens } from "@/lib/wallet-tokens";
import citizensData from "@/data/citizens.json";

export const revalidate = 300;

type Citizen = { id: number; civilization: string };
const CITIZEN_CIV: Record<number, string> = {};
for (const c of citizensData as Citizen[]) CITIZEN_CIV[c.id] = c.civilization;

type PerCivFloor = {
  civs: Array<{ slug: string; floor: number | null }>;
};

async function getGlobalFloor(): Promise<number> {
  try {
    const headers: Record<string, string> = {};
    if (process.env.OPENSEA_API_KEY)
      headers["X-API-KEY"] = process.env.OPENSEA_API_KEY;
    const r = await fetch(
      "https://api.opensea.io/api/v2/collections/freelons/stats",
      { headers, next: { revalidate: 300 } },
    );
    if (!r.ok) return 0;
    const d = await r.json();
    return Number(d?.total?.floor_price || 0);
  } catch {
    return 0;
  }
}

async function getPerCivFloors(origin: string): Promise<Record<string, number | null>> {
  try {
    const r = await fetch(`${origin}/api/opensea/per-civ-floor`, {
      next: { revalidate: 600 },
    });
    if (!r.ok) return {};
    const d = (await r.json()) as PerCivFloor;
    const map: Record<string, number | null> = {};
    for (const c of d.civs || []) map[c.slug] = c.floor;
    return map;
  } catch {
    return {};
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const tokens = await getWalletTokens(address);
  if (!tokens) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  const origin = new URL(req.url).origin;
  const [perCiv, globalFloor] = await Promise.all([
    getPerCivFloors(origin),
    getGlobalFloor(),
  ]);

  // Bucket the wallet's tokens by civilization
  const byCiv: Record<string, number[]> = {};
  for (const tid of tokens.tokenIds) {
    const civ = CITIZEN_CIV[tid] || "unknown";
    (byCiv[civ] ||= []).push(tid);
  }

  let value = 0;
  const civBreakdown = Object.entries(byCiv).map(([civ, ids]) => {
    const floor = perCiv[civ] ?? globalFloor;
    const subtotal = floor * ids.length;
    value += subtotal;
    return { civ, count: ids.length, floor, value: subtotal };
  });

  return NextResponse.json({
    address: tokens.address,
    balance: tokens.balance,
    tokenIds: tokens.tokenIds,
    truncated: tokens.truncated,
    value,
    globalFloor,
    civs: civBreakdown.sort((a, b) => b.value - a.value),
  });
}

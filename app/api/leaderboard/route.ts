import { NextResponse } from "next/server";
import { listWalletHexRecords } from "@/lib/wallet-hex-store";

export const revalidate = 120;

/**
 * GET /api/leaderboard?sort=balance|lifetime&limit=50
 * Returns top wallets by hex balance or lifetime earned.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") || "balance";
  const limit = Math.min(100, Math.max(5, parseInt(url.searchParams.get("limit") || "50", 10)));

  const records = await listWalletHexRecords(500);

  const sorted = [...records].sort((a, b) => {
    if (sort === "lifetime") return b.lifetimeEarned - a.lifetimeEarned;
    return b.balance - a.balance;
  });

  return NextResponse.json({
    sort,
    total: records.length,
    top: sorted.slice(0, limit).map((r) => ({
      address: r.address,
      balance: r.balance,
      lifetimeEarned: r.lifetimeEarned,
      claimStreak: r.claimStreak ?? 0,
    })),
  });
}

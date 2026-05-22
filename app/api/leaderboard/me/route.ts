import { NextResponse } from "next/server";
import { listWalletHexRecords, getWalletHex } from "@/lib/wallet-hex-store";
import { isValidAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";

export const revalidate = 120;

const DAY_MS = 86_400_000;

export async function GET(req: Request) {
  const rl = await limit(req, "lb:me", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const url = new URL(req.url);
  const addr = (url.searchParams.get("addr") || "").toLowerCase();
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  const [myRec, all] = await Promise.all([
    getWalletHex(addr),
    listWalletHexRecords(500),
  ]);

  const weekCutoff = Date.now() - 7 * DAY_MS;
  const myActive7d = myRec.events
    .filter((e) => e.ts >= weekCutoff && e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);

  // Compute viewer's position in each ranking
  const byActive7d = all
    .map((r) => ({ address: r.address, value: r.events.filter((e) => e.ts >= weekCutoff && e.amount > 0).reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  const byBalance = all.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance);
  const byLifetime = all.filter((r) => r.lifetimeEarned > 0).sort((a, b) => b.lifetimeEarned - a.lifetimeEarned);

  const findRank = (arr: Array<{ address: string }>) => {
    const i = arr.findIndex((r) => r.address === addr);
    return i >= 0 ? i + 1 : undefined;
  };

  return NextResponse.json({
    addr,
    balance: myRec.balance,
    lifetimeEarned: myRec.lifetimeEarned,
    active7d: myActive7d,
    rank: {
      active7d: findRank(byActive7d),
      balance: findRank(byBalance),
      lifetime: findRank(byLifetime),
    },
  });
}

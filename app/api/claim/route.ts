import { NextResponse } from "next/server";
import { canClaimToday, getLastClaim, setLastClaim, todayUTC } from "@/lib/daily-claim-store";
import { isValidAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { creditWalletHex, getWalletHex, setWalletHex } from "@/lib/wallet-hex-store";
import { ECONOMY } from "@/lib/economy-constants";
import { CANON } from "@/lib/canon";

const STREAK_MILESTONES: Record<number, number> = {
  3: ECONOMY.STREAK_3_BONUS,
  7: ECONOMY.STREAK_7_BONUS,
  30: ECONOMY.STREAK_30_BONUS,
};

function yesterdayUTC(): string {
  const d = new Date(Date.now() - 86400000);
  return d.toISOString().slice(0, 10);
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const rl = await limit(req, "claim:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const url = new URL(req.url);
  const addr = url.searchParams.get("addr") || "";
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  const last = await getLastClaim(addr);
  return NextResponse.json({
    today: todayUTC(),
    last,
    canClaim: last !== todayUTC(),
  });
}

export async function POST(req: Request) {
  const rl = await limit(req, "claim:post", { max: 10, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  let body: { addr?: string } = {};
  try {
    body = (await req.json()) as { addr?: string };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const addr = body.addr || "";
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!(await canClaimToday(addr))) {
    return NextResponse.json(
      { error: "already_claimed", today: todayUTC() },
      { status: 409 },
    );
  }
  await setLastClaim(addr, todayUTC());

  // Update streak + milestone bonuses on the wallet hex ledger
  let streak = 0;
  let bonus = 0;
  try {
    const rec = await getWalletHex(addr);
    const last = rec.lastClaimDay ?? null;
    if (last === yesterdayUTC()) streak = (rec.claimStreak ?? 0) + 1;
    else streak = 1;
    rec.claimStreak = streak;
    rec.lastClaimDay = todayUTC();
    await setWalletHex(rec);

    // Base claim
    await creditWalletHex(addr, ECONOMY.DAILY_CLAIM, {
      kind: "manual",
      note: `Daily X share · streak ${streak}d`,
    });

    bonus = STREAK_MILESTONES[streak] || 0;
    if (bonus > 0) {
      // 30-day streak is the milestone-of-milestones — earns the rare
      // 404 RESOLVED canon label. Lesser streaks use plain phrasing.
      const label = streak === 30 ? CANON.RESOLVED : "Streak milestone";
      await creditWalletHex(addr, bonus, {
        kind: "manual",
        note: `${label} · ${streak}d · +${bonus}⬡`,
      });
    }
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({
    ok: true,
    day: todayUTC(),
    awarded: ECONOMY.DAILY_CLAIM,
    streak,
    streakBonus: bonus,
  });
}

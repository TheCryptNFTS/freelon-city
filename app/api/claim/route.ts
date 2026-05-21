import { NextResponse } from "next/server";
import { canClaimToday, getLastClaim, setLastClaim, todayUTC } from "@/lib/daily-claim-store";
import { isValidAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { creditWalletHex, getWalletHex, setWalletHex } from "@/lib/wallet-hex-store";

const STREAK_MILESTONES: Record<number, number> = { 3: 25, 7: 100, 30: 500 };

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

    // Base +10 for the claim itself
    await creditWalletHex(addr, 10, {
      kind: "manual",
      note: `Daily X share · streak ${streak}d`,
    });

    bonus = STREAK_MILESTONES[streak] || 0;
    if (bonus > 0) {
      await creditWalletHex(addr, bonus, {
        kind: "manual",
        note: `Streak milestone · ${streak}d · +${bonus}⬡`,
      });
    }
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({
    ok: true,
    day: todayUTC(),
    awarded: 10,
    streak,
    streakBonus: bonus,
  });
}

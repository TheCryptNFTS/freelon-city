import { NextResponse } from "next/server";
import { getLastClaim, todayUTC, tryClaimToday } from "@/lib/daily-claim-store";
import { isValidAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { creditWalletHex, getWalletHex, setWalletHex } from "@/lib/wallet-hex-store";
import { ECONOMY } from "@/lib/economy-constants";
import { CANON } from "@/lib/canon";
import { requireSessionBound, isSameOrigin } from "@/lib/x-session";

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
  // CSRF: only accept same-origin browser POSTs (or non-browser callers
  // with a valid session — checked below).
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
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
  // Auth: require an HMAC X-session that is BOUND to this wallet. Without
  // this check, anyone could POST { addr: <victim> } and claim 10⬡ on
  // their behalf daily — the route trusted the body wholesale before.
  if (!requireSessionBound(req, addr)) {
    return NextResponse.json({ error: "session_required" }, { status: 401 });
  }
  // Atomic SET NX claim — two concurrent POSTs cannot both win the race.
  if (!(await tryClaimToday(addr))) {
    return NextResponse.json(
      { error: "already_claimed", today: todayUTC() },
      { status: 409 },
    );
  }

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

    // Collapse-mode earn multiplier
    const { getCollapseState, applyEarnMultiplier } = await import("@/lib/collapse-mode");
    const collapse = await getCollapseState();
    const dailyHex = applyEarnMultiplier(ECONOMY.DAILY_CLAIM, collapse);
    const noteSuffix = collapse.active ? " (collapse ½)" : "";

    // Base claim
    await creditWalletHex(addr, dailyHex, {
      kind: "manual",
      note: `Daily X share · streak ${streak}d · +${dailyHex}⬡${noteSuffix}`,
    });

    bonus = STREAK_MILESTONES[streak] || 0;
    if (bonus > 0) {
      // 30-day streak is the milestone-of-milestones — earns the rare
      // 404 RESOLVED canon label. Lesser streaks use plain phrasing.
      const label = streak === 30 ? CANON.RESOLVED : "Streak milestone";
      const bonusHex = applyEarnMultiplier(bonus, collapse);
      await creditWalletHex(addr, bonusHex, {
        kind: "manual",
        note: `${label} · ${streak}d · +${bonusHex}⬡${noteSuffix}`,
      });
      bonus = bonusHex; // return the actual amount paid
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

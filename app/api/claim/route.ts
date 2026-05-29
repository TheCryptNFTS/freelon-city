import { NextResponse } from "next/server";
import { getLastClaim, todayUTC, tryClaimToday, releaseClaimToday } from "@/lib/daily-claim-store";
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

  // Streak + base daily credit. 2026-05-29 fix: this block used to swallow
  // ALL errors and still return ok:true — so an Upstash blip during the
  // credit left the user locked out for the day (claim consumed) with zero
  // hex. Now the base credit is money-critical: if it throws, NOTHING was
  // paid (creditWalletHex either fully persists or throws without
  // crediting), so we RELEASE the claim lock and 500 — the user keeps their
  // claim and can retry.
  let streak = 0;
  let bonus = 0;
  let dailyHex: number = ECONOMY.DAILY_CLAIM;
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
    dailyHex = applyEarnMultiplier(ECONOMY.DAILY_CLAIM, collapse);
    const noteSuffix = collapse.active ? " (collapse ½)" : "";

    // Base claim — the first money operation.
    await creditWalletHex(addr, dailyHex, {
      kind: "manual",
      note: `Daily X share · streak ${streak}d · +${dailyHex}⬡${noteSuffix}`,
    });

    // Streak milestone bonus — a SEPARATE, non-critical credit. If it fails
    // we must NOT roll back the claim: the base was already paid, so a retry
    // would double-credit the base. Log it and return the base as success.
    const milestone = STREAK_MILESTONES[streak] || 0;
    if (milestone > 0) {
      try {
        // 30-day streak is the milestone-of-milestones — earns the rare
        // 404 RESOLVED canon label. Lesser streaks use plain phrasing.
        const label = streak === 30 ? CANON.RESOLVED : "Streak milestone";
        const bonusHex = applyEarnMultiplier(milestone, collapse);
        await creditWalletHex(addr, bonusHex, {
          kind: "manual",
          note: `${label} · ${streak}d · +${bonusHex}⬡${noteSuffix}`,
        });
        bonus = bonusHex; // return the actual amount paid
      } catch (e) {
        console.error("[claim] streak bonus credit failed (base paid, not rolled back)", addr, e);
      }
    }
  } catch (e) {
    // Base credit failed → nothing was paid. Release the claim so the user
    // can retry, and surface the failure instead of lying with ok:true.
    console.error("[claim] base credit failed — releasing claim for retry", addr, e);
    await releaseClaimToday(addr);
    return NextResponse.json({ error: "credit_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    day: todayUTC(),
    awarded: dailyHex,
    streak,
    streakBonus: bonus,
  });
}

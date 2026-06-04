/**
 * EARN PREMIUM RUNS — engagement feeds the agent. Holders earn premium runs (the
 * thing they'd otherwise pay to recharge) by doing things they already do:
 * keeping a daily claim streak, and referring new holders. This connects the
 * existing streak + referral systems to the agent money-loop.
 *
 * Runs are per-CITIZEN (tokenId); streaks/referrals are per-WALLET. So an earn
 * event targets ONE citizen the wallet chose (the caller passes the tokenId,
 * validated as owned upstream). Idempotency (don't double-grant the same streak
 * day / referral) is the CALLER's responsibility via its own store flags.
 *
 * PURE config + a thin grant wrapper. No payment, no value language.
 */
import { grantRuns } from "@/lib/missions/unlock-store";

/** What each earn event is worth, in premium runs. Env-tunable ceiling. */
export const EARN_RUNS = {
  /** Reaching a 7-day daily-claim streak. */
  streak7: 3,
  /** Reaching a 30-day streak (the big one). */
  streak30: 15,
  /** A referred wallet became a real holder. */
  referral: 5,
} as const;

export type EarnReason = keyof typeof EARN_RUNS;

/** Human label for notifications / the ledger. */
export const EARN_LABEL: Record<EarnReason, string> = {
  streak7: "7-day streak",
  streak30: "30-day streak",
  referral: "referral",
};

/**
 * Grant the runs for an earn event to a specific citizen. Returns the new run
 * balance. The caller must have already confirmed the wallet owns `tokenId` and
 * that this event hasn't been rewarded before (idempotency upstream).
 */
export async function awardRuns(tokenId: number, reason: EarnReason): Promise<{ runs: number; balance: number }> {
  const runs = EARN_RUNS[reason];
  const rec = await grantRuns({ tokenId, runs, reason });
  return { runs, balance: rec.credits };
}

/**
 * ONE entry point the claim/referral routes call. Resolves which citizen gets
 * the runs (the wallet's chosen "featured" citizen, else their first owned
 * token), grants, fires the earned notification, and is IDEMPOTENT per event via
 * an Upstash SET-NX claim so the same streak-day / referral can't double-grant.
 * Best-effort: returns null (and grants nothing) if the wallet owns no citizen
 * or the event was already claimed.
 */
export async function claimEarnedRuns(args: {
  wallet: string;
  reason: EarnReason;
  /** Unique per earn event, e.g. `streak7:0xabc:2026-06-04` or `referral:<joiner>`. */
  eventKey: string;
}): Promise<{ tokenId: number; runs: number; balance: number } | null> {
  const wallet = args.wallet.toLowerCase();

  // Idempotency: one grant per eventKey, ever.
  const { upstash, hasUpstash } = await import("@/lib/upstash-client");
  const claimKey = `freelon:earnruns:claimed:${args.eventKey}`;
  if (hasUpstash) {
    try {
      const ok = await upstash(["SET", claimKey, "1", "NX", "EX", String(400 * 24 * 60 * 60)]);
      if (ok !== "OK") return null; // already claimed
    } catch {
      /* infra hiccup → proceed (best-effort; rare double-grant acceptable over lost reward) */
    }
  }

  // Resolve the target citizen: featured pick, else first owned token.
  let tokenId: number | null = null;
  try {
    const { getFeaturedCitizen } = await import("@/lib/featured-citizen-store");
    tokenId = await getFeaturedCitizen(wallet);
  } catch { /* fall through */ }
  if (tokenId == null) {
    try {
      const { getWalletTokens } = await import("@/lib/wallet-tokens");
      const t = await getWalletTokens(wallet, 1);
      tokenId = Array.isArray(t?.tokenIds) && t.tokenIds.length > 0 ? t.tokenIds[0] : null;
    } catch { /* fall through */ }
  }
  if (tokenId == null) return null; // wallet holds no citizen → nothing to grant

  const { runs, balance } = await awardRuns(tokenId, args.reason);

  // Best-effort earned-runs notification.
  try {
    const { notifyRunsEarned } = await import("@/lib/missions/agent-notify");
    await notifyRunsEarned({ wallet, tokenId, runs, reasonLabel: EARN_LABEL[args.reason] });
  } catch { /* non-fatal */ }

  return { tokenId, runs, balance };
}

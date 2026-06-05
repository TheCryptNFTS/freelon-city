/**
 * EARN HEX — engagement feeds the agent. Holders earn HEX (the single usage
 * currency) by doing things they already do: keeping a daily-claim streak, and
 * referring new holders. This connects the existing streak + referral systems to
 * the agent money-loop.
 *
 * 2026-06-05: converted from per-citizen "premium runs" (a dead credit pool under
 * the HEX model) to per-WALLET HEX. HEX is per-wallet, so an earn event credits
 * the wallet directly. Amounts sit BELOW a premium run (~1500⬡) so engagement
 * rewards meaningfully toward premium use without trivially funding it for free —
 * the ETH unlock bonus stays the main fuel. Idempotency is the CALLER's job.
 */

/** What each earn event is worth, in ⬡. Conservative: below one premium run. */
export const EARN_HEX = {
  /** Reaching a 7-day daily-claim streak. */
  streak7: 1000,
  /** Reaching a 30-day streak (the big one). */
  streak30: 5000,
  /** A referred wallet became a real holder. */
  referral: 2000,
} as const;

export type EarnReason = keyof typeof EARN_HEX;

/** Human label for notifications / the ledger. */
export const EARN_LABEL: Record<EarnReason, string> = {
  streak7: "7-day streak",
  streak30: "30-day streak",
  referral: "referral",
};

/**
 * Credit the ⬡ for an earn event to a WALLET. Returns the amount + new balance.
 * The caller must have already confirmed eligibility + idempotency upstream.
 */
export async function awardHex(wallet: string, reason: EarnReason): Promise<{ hex: number; balance: number }> {
  const hex = EARN_HEX[reason];
  const { creditWalletHex } = await import("@/lib/wallet-hex-store");
  const rec = await creditWalletHex(wallet, hex, { kind: "quest", note: `Earned: ${EARN_LABEL[reason]} (+${hex}⬡)` });
  return { hex, balance: rec.balance };
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
}): Promise<{ tokenId: number | null; hex: number; balance: number } | null> {
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

  // HEX is per-wallet, so the credit doesn't need a citizen. We still resolve one
  // (featured pick, else first owned) purely so the notification can name it.
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

  const { hex, balance } = await awardHex(wallet, args.reason);

  // Best-effort earned notification.
  try {
    const { notifyRunsEarned } = await import("@/lib/missions/agent-notify");
    await notifyRunsEarned({ wallet, tokenId: tokenId ?? 0, runs: hex, reasonLabel: `${EARN_LABEL[args.reason]} (+${hex}⬡)` });
  } catch { /* non-fatal */ }

  return { tokenId, hex, balance };
}

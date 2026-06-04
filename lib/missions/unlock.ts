/**
 * AGENT UNLOCK — rarity-priced, ETH-denominated. Paying the unlock for a citizen
 * (one-time, tied to tokenId so it SURVIVES RESALE) activates its premium
 * abilities (deep Strategy/Red Team, Dossier, image generation) and grants a
 * FINITE POOL of "signal credits" (themed in 404 multiples). 1 credit = 1
 * premium action (a deep message OR an image). When the pool is spent, premium
 * stops until the holder re-unlocks (which REFILLS the pool).
 *
 * Why a finite pool (not a daily-forever quota): it's the only way a ONE-TIME
 * payment can GUARANTEE a holder cannot outspend what they paid. Max cost to us =
 * credits × worst-case-per-action (~8¢), which is ~24% of the unlock price — so
 * every tier stays deeply profitable AND structurally bounded. Credit counts are
 * env-tunable (UNLOCK_CREDIT_MULT) if ETH or the model price moves.
 *
 * Free commodity abilities (basic content/sales/research) are NOT gated — they
 * stay free + always available as the funnel. Only premium/image work spends
 * credits.
 *
 * PURE config + helpers — no I/O. The unlock record + credit balance live in
 * unlock-store.ts; payment reuses the orders rail.
 */

export type RarityTier =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Epic"
  | "Legendary"
  | "Honorary"
  | "One of One";

export type UnlockTier = {
  /** One-time unlock price, in ETH (native — floats in USD as ETH moves). */
  priceEth: number;
  /** Signal credits granted per unlock. 1 credit = 1 premium action. 404-themed.
   *  Finite — this is what makes "can't outspend the unlock" structurally true. */
  credits: number;
};

/** Optional env multiplier on every tier's credits — tune if ETH craters or the
 *  premium model's real price is higher than assumed (keeps margin positive
 *  without a redeploy). Default 1. */
function creditMult(): number {
  const n = Number(process.env.UNLOCK_CREDIT_MULT);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * The ladder. Commons cheap (~$13 at $2.7k ETH), insane at the top (1/1 = 1 ETH).
 * Pools are 404-themed multiples; each holds ~76%+ margin at WORST-CASE premium
 * cost and cannot be outspent (finite).
 */
export const UNLOCK_TIERS: Record<RarityTier, UnlockTier> = {
  Common:       { priceEth: 0.005, credits: 40 },
  Uncommon:     { priceEth: 0.01,  credits: 80 },
  Rare:         { priceEth: 0.025, credits: 200 },
  Epic:         { priceEth: 0.05,  credits: 404 },
  Legendary:    { priceEth: 0.15,  credits: 1010 },
  Honorary:     { priceEth: 0.33,  credits: 2020 },
  "One of One": { priceEth: 1.0,   credits: 4040 },
};

/** Normalize a citizen's free-text tier to a known tier (defaults to Common). */
export function tierOf(tierString: string | undefined | null): RarityTier {
  const t = (tierString ?? "").trim();
  if (t in UNLOCK_TIERS) return t as RarityTier;
  return "Common";
}

/** Fraction of the activation price a RECHARGE costs. Activation is the
 *  permanent, asset-value purchase (paid once, survives sale); recharge is just
 *  topping up the agent's premium runs, so it's much cheaper. Env-tunable. */
function rechargeFraction(): number {
  const n = Number(process.env.UNLOCK_RECHARGE_FRACTION);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.4;
}

export type ResolvedTier = {
  tier: RarityTier;
  /** One-time ACTIVATION price (permanent; includes the starter run pool). */
  priceEth: number;
  /** Premium runs granted on activation (and the recharge refill amount). 1 run
   *  = 1 premium job or image. "Runs" not "credits" — a usage count, not money. */
  runs: number;
  /** Cheaper RECHARGE price to refill runs once already activated. */
  rechargeEth: number;
};

/** The unlock config for a citizen's tier, with the env credit multiplier applied. */
export function unlockTierFor(tierString: string | undefined | null): ResolvedTier {
  const tier = tierOf(tierString);
  const base = UNLOCK_TIERS[tier];
  const runs = Math.round(base.credits * creditMult());
  // Round recharge to a clean-ish ETH value (5 decimals).
  const rechargeEth = Math.round(base.priceEth * rechargeFraction() * 1e5) / 1e5;
  return { tier, priceEth: base.priceEth, runs, rechargeEth };
}

/** Bulk-recharge packs: pay for N recharges at a discount (standard whale lever).
 *  pack "x5" = 5× the runs for 4× the price (one fewer paid), etc. Returns the
 *  ETH price and total runs for a given pack on a citizen's tier. */
export const RECHARGE_PACKS = {
  x1: { units: 1, payUnits: 1 },
  x5: { units: 5, payUnits: 4 },   // 20% off
  x10: { units: 10, payUnits: 8 }, // 20% off
} as const;
export type RechargePack = keyof typeof RECHARGE_PACKS;

export function rechargePackFor(tierString: string | undefined | null, pack: RechargePack): { runs: number; priceEth: number } {
  const t = unlockTierFor(tierString);
  const p = RECHARGE_PACKS[pack];
  return {
    runs: t.runs * p.units,
    priceEth: Math.round(t.rechargeEth * p.payUnits * 1e5) / 1e5,
  };
}

/** Which abilities/actions REQUIRE an unlock. Free funnel stays open. */
export const UNLOCK_GATED_ABILITIES = new Set<string>([
  "strategy", // deep "Fix My Launch"
  "risk", // Red Team
  "dossier", // the memory moat
  "deploy-citizen", // image generation
]);

/** Does this mission require an unlock to run? */
export function requiresUnlock(missionId: string): boolean {
  return UNLOCK_GATED_ABILITIES.has(missionId);
}

/** Is this an image mission (counts against the image quota, not the message quota)? */
export function isImageMission(missionId: string): boolean {
  return missionId === "deploy-citizen";
}

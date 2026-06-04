/**
 * Unlock state + signal-credit BALANCE, keyed by tokenId (so it SURVIVES RESALE
 * — the new owner inherits an activated agent with its remaining credits, the
 * resale-value story).
 *
 *   isUnlocked(tokenId)        → has this citizen ever been unlocked?
 *   grantUnlock(tokenId, …)    → add the tier's credits to the balance (after
 *                                payment verified). Re-unlocking REFILLS.
 *   spendCredit(tokenId)       → atomically spend ONE credit; ok:false when the
 *                                balance is 0 (nothing spent). This is what makes
 *                                "can't outspend the unlock" structurally true.
 *   refundCredit(tokenId)      → give a credit back when a run fails.
 *   unlockStatus(tokenId)      → { unlocked, credits, tier, priceEth, capCredits }
 *
 * In-memory fallback (globalThis-backed, shared across Next dev route bundles);
 * Upstash in prod.
 */
import { upstash, hasUpstash } from "@/lib/upstash-client";
import { getCitizen } from "@/lib/citizens";
import { unlockTierFor } from "@/lib/missions/unlock";

export type UnlockRecord = {
  tokenId: number;
  tier: string;
  /** PERMANENT — once activated, always activated (survives sale). Activation is
   *  the asset-value purchase; it is never re-paid. Recharge only refills runs. */
  activated: boolean;
  /** Remaining premium RUNS (1 run = 1 premium job or image). Not a currency — a
   *  usage count. Refilled by recharge; never lets a holder outspend what they paid. */
  credits: number;
  /** Lifetime runs granted across activation + recharges — for display. */
  lifetimeGranted: number;
  priceEthPaid: number;
  lastTxHash: string;
  unlockedAt: number;
  updatedAt: number;
};

const KEY = (id: number) => `freelon:unlock:v2:${id}`;
const LOCK = (id: number) => `freelon:unlock:lock:${id}`;

type Mem = { unlocks: Map<number, UnlockRecord> };
const mem: Mem = ((globalThis as { __freelonUnlockMem?: Mem }).__freelonUnlockMem ??= { unlocks: new Map() });

export async function getUnlock(tokenId: number): Promise<UnlockRecord | null> {
  if (!hasUpstash) return mem.unlocks.get(tokenId) ?? null;
  try {
    const raw = (await upstash(["GET", KEY(tokenId)])) as string | null;
    return raw ? (JSON.parse(raw) as UnlockRecord) : null;
  } catch {
    return null;
  }
}

/** Is this citizen ACTIVATED (permanent)? */
export async function isUnlocked(tokenId: number): Promise<boolean> {
  return (await getUnlock(tokenId))?.activated === true;
}

async function put(rec: UnlockRecord): Promise<void> {
  if (hasUpstash) await upstash(["SET", KEY(rec.tokenId), JSON.stringify(rec)]).catch(() => {});
  else mem.unlocks.set(rec.tokenId, rec);
}

// Advisory lock so a concurrent spend + grant can't clobber the balance.
async function withLock<T>(tokenId: number, fn: () => Promise<T>): Promise<T> {
  if (!hasUpstash) return fn();
  for (let i = 0; i < 5; i++) {
    try {
      if ((await upstash(["SET", LOCK(tokenId), "1", "NX", "EX", "3"])) === "OK") break;
    } catch {
      break;
    }
    await new Promise((r) => setTimeout(r, 60 + i * 30));
  }
  try {
    return await fn();
  } finally {
    await upstash(["DEL", LOCK(tokenId)]).catch(() => {});
  }
}

/**
 * ACTIVATE a citizen after a verified activation payment — permanent + grants
 * the starter run pool. Idempotent: if already activated, it just tops up runs
 * (so a duplicate claim never double-charges activation semantics).
 */
export async function activate(args: { tokenId: number; txHash: string; priceEthPaid: number }): Promise<UnlockRecord> {
  return withLock(args.tokenId, async () => {
    const tier = unlockTierFor(getCitizen(args.tokenId)?.tier);
    const prev = await getUnlock(args.tokenId);
    const now = Date.now();
    const rec: UnlockRecord = {
      tokenId: args.tokenId,
      tier: tier.tier,
      activated: true,
      credits: (prev?.credits ?? 0) + tier.runs,
      lifetimeGranted: (prev?.lifetimeGranted ?? 0) + tier.runs,
      priceEthPaid: args.priceEthPaid,
      lastTxHash: args.txHash,
      unlockedAt: prev?.unlockedAt ?? now,
      updatedAt: now,
    };
    await put(rec);
    return rec;
  });
}

/**
 * RECHARGE — refill premium runs on an ALREADY-ACTIVATED citizen (cheaper, no
 * re-activation). Returns null if the citizen isn't activated yet.
 */
export async function recharge(args: { tokenId: number; txHash: string; priceEthPaid: number }): Promise<UnlockRecord | null> {
  return withLock(args.tokenId, async () => {
    const prev = await getUnlock(args.tokenId);
    if (!prev?.activated) return null;
    const tier = unlockTierFor(getCitizen(args.tokenId)?.tier);
    const now = Date.now();
    const rec: UnlockRecord = {
      ...prev,
      credits: prev.credits + tier.runs,
      lifetimeGranted: prev.lifetimeGranted + tier.runs,
      priceEthPaid: args.priceEthPaid,
      lastTxHash: args.txHash,
      updatedAt: now,
    };
    await put(rec);
    return rec;
  });
}

/**
 * GRANT FREE RUNS — add premium runs to a citizen WITHOUT payment. Used by
 * earned-reward paths (daily streak, referral) so engagement feeds the agent.
 * Does NOT require prior activation: granting runs to a locked citizen also
 * ACTIVATES it (the reward IS the activation) so a holder can earn their way in.
 * `reason` is recorded for the ledger/notification. Idempotency is the caller's
 * job (e.g. streak/referral stores mark their own "already rewarded" flag).
 */
export async function grantRuns(args: { tokenId: number; runs: number; reason: string }): Promise<UnlockRecord> {
  const add = Math.max(0, Math.floor(args.runs));
  return withLock(args.tokenId, async () => {
    const prev = await getUnlock(args.tokenId);
    const tier = unlockTierFor(getCitizen(args.tokenId)?.tier);
    const now = Date.now();
    const rec: UnlockRecord = {
      tokenId: args.tokenId,
      tier: tier.tier,
      activated: true, // earned runs activate the agent
      credits: (prev?.credits ?? 0) + add,
      lifetimeGranted: (prev?.lifetimeGranted ?? 0) + add,
      priceEthPaid: prev?.priceEthPaid ?? 0,
      lastTxHash: prev?.lastTxHash ?? `earned:${args.reason}`,
      unlockedAt: prev?.unlockedAt ?? now,
      updatedAt: now,
    };
    await put(rec);
    return rec;
  });
}

export type SpendVerdict =
  | { ok: true; remaining: number }
  | { ok: false; reason: "locked" | "no_credits"; remaining: number };

/** Spend ONE premium run. ok:false (nothing spent) if not activated or out of runs. */
export async function spendCredit(tokenId: number): Promise<SpendVerdict> {
  return withLock(tokenId, async () => {
    const rec = await getUnlock(tokenId);
    if (!rec?.activated) return { ok: false, reason: "locked", remaining: 0 };
    if (rec.credits <= 0) return { ok: false, reason: "no_credits", remaining: 0 };
    rec.credits -= 1;
    rec.updatedAt = Date.now();
    await put(rec);
    return { ok: true, remaining: rec.credits };
  });
}

/** Give a credit back when a run failed to deliver output. */
export async function refundCredit(tokenId: number): Promise<void> {
  await withLock(tokenId, async () => {
    const rec = await getUnlock(tokenId);
    if (!rec) return;
    rec.credits += 1;
    rec.updatedAt = Date.now();
    await put(rec);
  });
}

export type UnlockStatus = {
  /** Permanently activated? (was "unlocked") */
  unlocked: boolean;
  /** Remaining premium runs. */
  credits: number;
  tier: string;
  /** One-time activation price. */
  priceEth: number;
  /** Cheaper recharge price (refill runs once activated). */
  rechargeEth: number;
  /** Runs granted per activation / recharge. */
  grantPerUnlock: number;
};

/** Read-only status for the dashboard meter + activate/recharge CTA. */
export async function unlockStatus(tokenId: number): Promise<UnlockStatus> {
  const tier = unlockTierFor(getCitizen(tokenId)?.tier);
  const rec = await getUnlock(tokenId);
  return {
    unlocked: rec?.activated === true,
    credits: rec?.credits ?? 0,
    tier: tier.tier,
    priceEth: tier.priceEth,
    rechargeEth: tier.rechargeEth,
    grantPerUnlock: tier.runs,
  };
}

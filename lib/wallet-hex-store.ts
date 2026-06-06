/**
 * Per-wallet hex ledger. Distinct from carrier-handle hex (which is keyed
 * by social handle). Stores:
 *   - balance: current claimable hex
 *   - lifetimeEarned: total ever credited
 *   - lastHolderTickDay: ISO day of the last holder snapshot
 *   - sweepsToday + sweepsResetDay: per-day sweep counter for cap enforcement
 *   - lastEventTs: ts of newest credited OpenSea event (cursor)
 *   - events: small ring buffer of recent earnings (last 50, for UI)
 *
 * Wallet keys are always lowercased.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

export type HexEvent = {
  ts: number;
  kind: "hold" | "sweep" | "sweep_streak" | "quest" | "manual";
  amount: number;
  note?: string;
};

export type WalletHex = {
  address: string;
  balance: number;
  lifetimeEarned: number;
  lastHolderTickDay: string | null;
  lastEventTs: number;
  sweepsToday: number;
  sweepsResetDay: string;
  events: HexEvent[];
  /** Daily claim streak (consecutive UTC days). Resets if a day is missed. */
  claimStreak?: number;
  /** UTC day of the last claim. */
  lastClaimDay?: string | null;
  /** UTC day of last floor-defender tick (Tier 7 — held citizens 30d+). */
  lastDefenderTickDay?: string | null;
  /**
   * UTC day of the wallet's last ACTIVE action (claim, sweep, snipe, sale).
   * Used by the 14-day decay gate in holder-tick — if a wallet hasn't been
   * active for ECONOMY.ACTIVITY_DECAY_DAYS, passive earnings pause until
   * the next active action. Null/undefined = never seen, treated as active.
   */
  lastActiveDay?: string | null;
  /** Cursor for sale-share crediting (newest credited sale timestamp). */
  lastSaleCreditTs?: number;
  /** Whether the one-time fresh-blood bounty has been awarded. */
  freshBloodAwardedAt?: number;
};

const memory = new Map<string, WalletHex>();

/** Per-process memoization: wallets whose defender streak start has been
 *  ensured this session. Avoids repeated Upstash GET on every credit. */
const defenderEnsured = new Set<string>();
async function fireDefenderEnsure(addr: string): Promise<void> {
  const w = addr.toLowerCase();
  if (defenderEnsured.has(w)) return;
  defenderEnsured.add(w);
  try {
    const { ensureDefenderStarted } = await import("@/lib/ghost-store");
    await ensureDefenderStarted(w);
  } catch {
    // Allow retry on next credit if the ensure failed (network etc.)
    defenderEnsured.delete(w);
  }
}

const KEY = (addr: string) => `freelon:walletHex:v1:${addr.toLowerCase()}`;
const LOCK = (addr: string) => `freelon:walletHex:lock:${addr.toLowerCase()}`;

/**
 * Serialize a read-modify-write on one wallet's hex record. Without this, two
 * concurrent debits (e.g. two paid renders fired from two tabs/devices) can both
 * read balance B, both pass the balance check, and both write B-cost — losing
 * one debit (a paid run for free). Mirrors `unlock-store.withLock`. Best-effort:
 * if the lock can't be taken within ~5 tries it proceeds anyway (the window is
 * already tiny), and a missing Upstash falls straight through to the in-memory
 * map (single-process, no race). The premium $-budget pool still backstops COGS.
 */
async function withWalletLock<T>(
  addr: string,
  fn: () => Promise<T>,
  failClosed = false,
): Promise<T> {
  if (!hasUpstash) return fn();
  const key = LOCK(addr);
  let acquired = false;
  for (let i = 0; i < 5; i++) {
    try {
      if ((await upstash(["SET", key, "1", "NX", "EX", "3"])) === "OK") { acquired = true; break; }
    } catch {
      // Lock-infra error. For a debit (failClosed) we must NOT proceed unlocked —
      // a concurrent read-modify-write would double-spend; reject and let the
      // caller retry. For a credit, proceeding loses at most one credit, so fall
      // through (preserves prior best-effort behaviour).
      if (failClosed) throw new WalletBusyError(addr);
      break;
    }
    await new Promise((r) => setTimeout(r, 60 + i * 30));
  }
  // Never won the lock. Debits fail closed (no double-spend); credits proceed.
  if (!acquired && failClosed) throw new WalletBusyError(addr);
  try {
    return await fn();
  } finally {
    // Only release a lock we actually took — never DEL another holder's lock.
    if (acquired) await upstash(["DEL", key]).catch(() => {});
  }
}

function emptyRecord(addr: string): WalletHex {
  return {
    address: addr.toLowerCase(),
    balance: 0,
    lifetimeEarned: 0,
    lastHolderTickDay: null,
    lastEventTs: 0,
    sweepsToday: 0,
    sweepsResetDay: todayUTC(),
    events: [],
    claimStreak: 0,
    lastClaimDay: null,
    lastDefenderTickDay: null,
  };
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getWalletHex(addr: string): Promise<WalletHex> {
  const a = addr.toLowerCase();
  if (!hasUpstash) return memory.get(a) ?? emptyRecord(a);
  try {
    const raw = (await upstash(["GET", KEY(a)])) as string | null;
    if (!raw) return emptyRecord(a);
    return JSON.parse(raw) as WalletHex;
  } catch {
    return emptyRecord(a);
  }
}

export async function setWalletHex(rec: WalletHex): Promise<void> {
  rec.address = rec.address.toLowerCase();
  if (!hasUpstash) {
    memory.set(rec.address, rec);
    return;
  }
  await upstash(["SET", KEY(rec.address), JSON.stringify(rec)]);
}

/** Active-action event kinds — these stamp lastActiveDay (decay reset). */
const ACTIVE_KINDS: ReadonlySet<HexEvent["kind"]> = new Set([
  "sweep",
  "sweep_streak",
  "quest",
  "manual", // daily X claim uses kind="manual"
] as const);

export async function creditWalletHex(
  addr: string,
  amount: number,
  ev: Omit<HexEvent, "ts" | "amount"> & { ts?: number },
): Promise<WalletHex> {
  const rec = await withWalletLock(addr, async () => {
    const r = await getWalletHex(addr);
    r.balance += amount;
    r.lifetimeEarned += amount;
    const ts = ev.ts ?? Date.now();
    r.events.unshift({ ts, kind: ev.kind, amount, note: ev.note });
    if (r.events.length > 50) r.events.length = 50;
    r.lastEventTs = Math.max(r.lastEventTs, ts);
    // Stamp activity for the decay gate when this credit is an active action.
    if (ACTIVE_KINDS.has(ev.kind)) {
      r.lastActiveDay = todayUTC();
    }
    await setWalletHex(r);
    return r;
  });
  // Lazy defender-streak init. Fires once per wallet per process — any earning
  // event (sweep/claim/sale/manual) starts a defender record from now if the
  // wallet has never been tracked. Subsequent dumps break it.
  void fireDefenderEnsure(rec.address);
  return rec;
}

/** Explicitly stamp activity (e.g. snipe/sale events that aren't kind=manual). */
export async function stampActivity(addr: string): Promise<void> {
  const rec = await getWalletHex(addr);
  rec.lastActiveDay = todayUTC();
  await setWalletHex(rec);
}

/**
 * Scan all wallet hex records (Upstash KEYS pattern). For the leaderboard.
 * Limited to first 500 wallets to keep latency bounded.
 */
export async function listWalletHexRecords(limit = 500): Promise<WalletHex[]> {
  if (!hasUpstash) {
    return Array.from(memory.values()).slice(0, limit);
  }
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    // SCAN with MATCH pattern. COUNT bumped to 1000 — Upstash REST
    // each call is its own HTTP round-trip, so a higher COUNT cuts
    // round-trips proportionally. Also a hard wall-clock budget so
    // a busy Upstash instance can't blow the function timeout.
    const pattern = "freelon:walletHex:v1:*";
    const keys: string[] = [];
    let cursor = "0";
    let pages = 0;
    const startedAt = Date.now();
    const HARD_BUDGET_MS = 5000;
    do {
      if (Date.now() - startedAt > HARD_BUDGET_MS) break;
      const res = await fetch(
        `${url}/SCAN/${encodeURIComponent(cursor)}/MATCH/${encodeURIComponent(pattern)}/COUNT/1000`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (!res.ok) break;
      const j = (await res.json()) as { result: [string, string[]] };
      cursor = j.result[0];
      for (const k of j.result[1]) keys.push(k);
      pages++;
      if (keys.length >= limit || pages > 10) break;
    } while (cursor !== "0");

    if (keys.length === 0) return [];
    // MGET all matched keys
    const mgetUrl = `${url}/MGET/${keys.map((k) => encodeURIComponent(k)).join("/")}`;
    const mr = await fetch(mgetUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!mr.ok) return [];
    const mj = (await mr.json()) as { result: (string | null)[] };
    const out: WalletHex[] = [];
    for (const raw of mj.result) {
      if (!raw) continue;
      try {
        out.push(JSON.parse(raw) as WalletHex);
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Thrown by debitWalletHex when the wallet's balance is too low to
 * cover the requested debit. Callers can distinguish this expected
 * business outcome from infrastructure failures (Upstash, RPC, etc.)
 * via `e instanceof InsufficientHexError`. 2026-05-26 economy audit
 * R4: replaces the prior untyped `new Error("insufficient_hex")`.
 * Compatible with `Error` semantics — existing `catch (e: unknown)`
 * sites that just propagate or stringify the error still work.
 */
/**
 * Thrown by debitWalletHex when the per-wallet lock could not be acquired, so
 * the debit refused to proceed rather than risk a concurrent double-spend. This
 * is a TRANSIENT condition — the caller should surface a "busy, retry" (503),
 * not a hard failure. Distinct from InsufficientHexError (a real shortfall).
 */
export class WalletBusyError extends Error {
  readonly address: string;
  constructor(addr: string) {
    super(`wallet_busy: could not lock wallet ${addr} for a debit`);
    this.name = "WalletBusyError";
    this.address = addr;
  }
}

export class InsufficientHexError extends Error {
  readonly balance: number;
  readonly requested: number;
  constructor(addr: string, balance: number, requested: number) {
    super(`insufficient_hex: wallet ${addr} balance ${balance} < requested ${requested}`);
    this.name = "InsufficientHexError";
    this.balance = balance;
    this.requested = requested;
  }
}

export async function debitWalletHex(
  addr: string,
  amount: number,
  ev: Omit<HexEvent, "ts" | "amount"> & { ts?: number },
): Promise<WalletHex> {
  return withWalletLock(addr, async () => {
    const rec = await getWalletHex(addr);
    if (rec.balance < amount) throw new InsufficientHexError(addr, rec.balance, amount);
    rec.balance -= amount;
    rec.events.unshift({
      ts: ev.ts ?? Date.now(),
      kind: ev.kind,
      amount: -amount,
      note: ev.note,
    });
    if (rec.events.length > 50) rec.events.length = 50;
    await setWalletHex(rec);
    return rec;
  }, /* failClosed */ true);
}

/**
 * Shared-city store — the one global "Restore the Signal" world.
 *
 * Server-authoritative. The client renders an optimistic counter for feel, but
 * every number here is reconciled against the server clock on each action, so
 * there is no client-trusted accrual to exploit. Two record kinds:
 *
 *   freelon:city:v1:s<season>:state         → CityState   (the single city)
 *   freelon:city:v1:s<season>:w:<addr>       → CityWallet  (one per wallet)
 *
 * Backed by Upstash REST (same as lib/wallet-hex-store) with an in-memory
 * fallback so it runs locally with no env. Wallet keys are lowercased.
 *
 * ECONOMY ISOLATION: city signal is its OWN currency. Nothing here ever credits
 * the real hex ledger (lib/wallet-hex-store). The only bridge is the boost
 * endpoint, which DEBITS real hex (a sink) — handled in the route, never here.
 */

import citizensData from "@/data/citizens.json";
import {
  ACCRUAL_CAP_SEC,
  CITY_SEASON,
  STARTING_SIGNAL,
  STRUCTURE_BY_KEY,
  baseRate,
  civsLitAt,
  companionMultiplier,
  costOf,
  holderMultiplier,
  reclaimMultiplier,
  setMultiplier,
} from "@/lib/city-config";
import { getWalletSet } from "@/lib/signal-set";
import type { CasteName } from "@/lib/constants";

export type CityState = {
  season: number;
  totalSignal: number;
  updatedTs: number;
};

export type CityWallet = {
  address: string;
  season: number;
  signal: number; // spendable
  contributed: number; // lifetime generated → leaderboard + global share
  structures: Record<string, number>;
  balance: number; // cached citizen count (drives holder multiplier)
  castes: string[]; // cached caste names held (for build gating UI)
  setTiers: number; // cached count of connected collections held (Full Signal bonus)
  oogieCount: number; // cached OOGIE count (companion depth bonus); shares the set scan
  cryptCount: number; // cached The Crypt count (reclaim bonus); shares the set scan
  setCheckedTs: number; // when the cross-collection set was last scanned
  seeded: boolean; // whether the one-time starting grant was applied
  lastTickTs: number;
  updatedTs: number;
};

/** How often the cross-collection set is re-scanned per wallet. The result is
 *  cached on the wallet record so heartbeats never pay the 6-collection cost. */
const SET_REFRESH_MS = 10 * 60_000;

const memState = new Map<string, CityState>();
const memWallet = new Map<string, CityWallet>();

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

async function upstash(cmd: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const j = (await res.json()) as { result: unknown };
  return j.result;
}

const STATE_KEY = `freelon:city:v1:s${CITY_SEASON}:state`;
const WALLET_KEY = (addr: string) =>
  `freelon:city:v1:s${CITY_SEASON}:w:${addr.toLowerCase()}`;

function emptyState(): CityState {
  return { season: CITY_SEASON, totalSignal: 0, updatedTs: Date.now() };
}

function emptyWallet(addr: string): CityWallet {
  return {
    address: addr.toLowerCase(),
    season: CITY_SEASON,
    signal: 0,
    contributed: 0,
    structures: {},
    balance: 0,
    castes: [],
    setTiers: 0,
    oogieCount: 0,
    cryptCount: 0,
    setCheckedTs: 0,
    seeded: false,
    lastTickTs: Date.now(),
    updatedTs: Date.now(),
  };
}

// ── token → caste derivation ─────────────────────────────────────────────
const ID_TO_CASTE = new Map<number, CasteName>();
for (const c of citizensData as Array<{ id: number; caste: CasteName }>) {
  ID_TO_CASTE.set(c.id, c.caste);
}

/** Distinct castes held, from a list of owned token ids. */
export function derivedCastes(tokenIds: number[]): CasteName[] {
  const set = new Set<CasteName>();
  for (const id of tokenIds) {
    const caste = ID_TO_CASTE.get(id);
    if (caste) set.add(caste);
  }
  return [...set];
}

// ── global state ─────────────────────────────────────────────────────────
export async function getCityState(): Promise<CityState> {
  if (!hasUpstash) return memState.get(STATE_KEY) ?? emptyState();
  try {
    const raw = (await upstash(["GET", STATE_KEY])) as string | null;
    if (!raw) return emptyState();
    return JSON.parse(raw) as CityState;
  } catch {
    return emptyState();
  }
}

async function setCityState(s: CityState): Promise<void> {
  s.updatedTs = Date.now();
  if (!hasUpstash) {
    memState.set(STATE_KEY, s);
    return;
  }
  await upstash(["SET", STATE_KEY, JSON.stringify(s)]);
}

/** Add to the global total (the only writer of totalSignal). */
async function addGlobal(delta: number): Promise<CityState> {
  const s = await getCityState();
  if (delta > 0) s.totalSignal += delta;
  await setCityState(s);
  return s;
}

// ── per-wallet ───────────────────────────────────────────────────────────
export async function getCityWallet(addr: string): Promise<CityWallet> {
  const a = addr.toLowerCase();
  if (!hasUpstash) return memWallet.get(WALLET_KEY(a)) ?? emptyWallet(a);
  try {
    const raw = (await upstash(["GET", WALLET_KEY(a)])) as string | null;
    if (!raw) return emptyWallet(a);
    return { ...emptyWallet(a), ...(JSON.parse(raw) as CityWallet) };
  } catch {
    return emptyWallet(a);
  }
}

async function setCityWallet(w: CityWallet): Promise<void> {
  w.address = w.address.toLowerCase();
  w.updatedTs = Date.now();
  if (!hasUpstash) {
    memWallet.set(WALLET_KEY(w.address), w);
    return;
  }
  await upstash(["SET", WALLET_KEY(w.address), JSON.stringify(w)]);
}

/**
 * Server-authoritative accrual. Computes signal generated since lastTickTs
 * using the SERVER clock, capped at ACCRUAL_CAP_SEC, applies the holder
 * multiplier from the cached balance, and credits the wallet (spendable +
 * lifetime) and the global total. Mutates+persists the wallet, returns the
 * gain. The global write only happens when gain > 0.
 *
 * `ownership` (optional) refreshes the cached balance/castes when the route
 * has already fetched them — avoids a stale multiplier without an extra
 * OpenSea round-trip on every heartbeat.
 */
export async function accrueWallet(
  addr: string,
  ownership?: { balance: number; castes: CasteName[] },
): Promise<{ wallet: CityWallet; gain: number }> {
  const w = await getCityWallet(addr);
  if (ownership) {
    w.balance = Math.max(0, Math.floor(ownership.balance));
    w.castes = ownership.castes;
  }
  // One-time bootstrap grant so a brand-new player can afford their first
  // nodes. Does NOT count toward contribution or the global total — it's seed
  // capital, not generated signal.
  if (!w.seeded) {
    w.seeded = true;
    w.signal += STARTING_SIGNAL;
  }
  const now = Date.now();
  // Lazy Full Signal refresh: at most once per SET_REFRESH_MS per wallet, so
  // the per-heartbeat path never triggers the 6-collection lookup. Fail-safe —
  // a failed/partial scan leaves the cached tiers untouched (defaults to 0 →
  // 1.0x), so an outage can never inflate output.
  if (now - (w.setCheckedTs || 0) > SET_REFRESH_MS) {
    try {
      const s = await getWalletSet(addr);
      if (!s.partial) {
        w.setTiers = s.tiersHeld;
        w.oogieCount = s.entries.find((e) => e.slug === "oogies")?.count ?? 0;
        w.cryptCount =
          s.entries.find((e) => e.slug === "the-crypt-official")?.count ?? 0;
        w.setCheckedTs = now;
      }
    } catch {
      /* keep cached setTiers */
    }
  }
  const elapsedSec = Math.min(
    Math.max(0, (now - w.lastTickTs) / 1000),
    ACCRUAL_CAP_SEC,
  );
  const rate =
    baseRate(w.structures) *
    holderMultiplier(w.balance) *
    setMultiplier(w.setTiers) *
    companionMultiplier(w.oogieCount) *
    reclaimMultiplier(w.cryptCount);
  const gain = rate * elapsedSec;
  w.lastTickTs = now;
  if (gain > 0) {
    w.signal += gain;
    w.contributed += gain;
  }
  await setCityWallet(w);
  if (gain > 0) await addGlobal(gain);
  return { wallet: w, gain };
}

export class CityBuildError extends Error {
  readonly code: string;
  constructor(code: string, msg?: string) {
    super(msg ?? code);
    this.name = "CityBuildError";
    this.code = code;
  }
}

/**
 * Build one structure. Accrues first (so the spendable balance is current),
 * enforces caste gating against the route-verified `allowedCastes`, then
 * checks affordability and applies. Returns the updated wallet.
 *
 * Caste gating is authoritative here but relies on the caller passing a
 * server-verified caste set (from getWalletTokens), never client claims.
 */
export async function buildStructure(
  addr: string,
  key: string,
  allowedCastes: CasteName[],
  ownership?: { balance: number; castes: CasteName[] },
): Promise<CityWallet> {
  const s = STRUCTURE_BY_KEY[key];
  if (!s) throw new CityBuildError("unknown_structure");
  if (s.caste !== null && !allowedCastes.includes(s.caste)) {
    throw new CityBuildError("caste_locked", `requires ${s.caste}`);
  }
  // Accrue, then re-read the freshly persisted wallet to spend against truth.
  await accrueWallet(addr, ownership);
  const w = await getCityWallet(addr);
  const owned = w.structures[s.key] || 0;
  const cost = costOf(s, owned);
  if (w.signal < cost) {
    throw new CityBuildError("insufficient_signal", `need ${cost}`);
  }
  w.signal -= cost;
  w.structures[s.key] = owned + 1;
  await setCityWallet(w);
  return w;
}

/**
 * Apply a real-hex boost as city signal. The hex DEBIT happens in the route
 * (the live economy sink); this only credits the isolated city ledger:
 * spendable + lifetime contribution + global total.
 */
export async function applyBoost(
  addr: string,
  citySignal: number,
): Promise<CityWallet> {
  await accrueWallet(addr);
  const w = await getCityWallet(addr);
  w.signal += citySignal;
  w.contributed += citySignal;
  await setCityWallet(w);
  await addGlobal(citySignal);
  return w;
}

/**
 * Top contributors for the leaderboard. SCAN+MGET over the season's wallet
 * keys (same bounded pattern as lib/wallet-hex-store#listWalletHexRecords).
 */
export async function listTopContributors(limit = 50): Promise<
  Array<{ address: string; contributed: number; structures: number }>
> {
  let records: CityWallet[] = [];
  if (!hasUpstash) {
    records = Array.from(memWallet.values());
  } else {
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL!;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
      const pattern = `freelon:city:v1:s${CITY_SEASON}:w:*`;
      const keys: string[] = [];
      let cursor = "0";
      let pages = 0;
      const startedAt = Date.now();
      do {
        if (Date.now() - startedAt > 5000) break;
        const res = await fetch(
          `${url}/SCAN/${encodeURIComponent(cursor)}/MATCH/${encodeURIComponent(pattern)}/COUNT/1000`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
        );
        if (!res.ok) break;
        const j = (await res.json()) as { result: [string, string[]] };
        cursor = j.result[0];
        for (const k of j.result[1]) keys.push(k);
        pages++;
        if (keys.length >= 500 || pages > 10) break;
      } while (cursor !== "0");

      if (keys.length) {
        const mr = await fetch(
          `${url}/MGET/${keys.map((k) => encodeURIComponent(k)).join("/")}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
        );
        if (mr.ok) {
          const mj = (await mr.json()) as { result: (string | null)[] };
          for (const raw of mj.result) {
            if (!raw) continue;
            try {
              records.push(JSON.parse(raw) as CityWallet);
            } catch {}
          }
        }
      }
    } catch {
      records = [];
    }
  }

  return records
    .sort((a, b) => b.contributed - a.contributed)
    .slice(0, limit)
    .map((r) => ({
      address: r.address,
      contributed: r.contributed,
      structures: Object.values(r.structures || {}).reduce((n, v) => n + v, 0),
    }));
}

/** Derived view helper for the global progress UI. */
export function cityProgress(total: number) {
  return { lit: civsLitAt(total), total };
}

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
};

const memory = new Map<string, WalletHex>();
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY = (addr: string) => `freelon:walletHex:v1:${addr.toLowerCase()}`;

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

export async function creditWalletHex(
  addr: string,
  amount: number,
  ev: Omit<HexEvent, "ts" | "amount"> & { ts?: number },
): Promise<WalletHex> {
  const rec = await getWalletHex(addr);
  rec.balance += amount;
  rec.lifetimeEarned += amount;
  const ts = ev.ts ?? Date.now();
  rec.events.unshift({ ts, kind: ev.kind, amount, note: ev.note });
  if (rec.events.length > 50) rec.events.length = 50;
  rec.lastEventTs = Math.max(rec.lastEventTs, ts);
  await setWalletHex(rec);
  return rec;
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
    // SCAN with MATCH pattern
    const pattern = "freelon:walletHex:v1:*";
    const keys: string[] = [];
    let cursor = "0";
    let pages = 0;
    do {
      const res = await fetch(
        `${url}/SCAN/${encodeURIComponent(cursor)}/MATCH/${encodeURIComponent(pattern)}/COUNT/200`,
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

export async function debitWalletHex(
  addr: string,
  amount: number,
  ev: Omit<HexEvent, "ts" | "amount"> & { ts?: number },
): Promise<WalletHex> {
  const rec = await getWalletHex(addr);
  if (rec.balance < amount) throw new Error("insufficient_hex");
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
}

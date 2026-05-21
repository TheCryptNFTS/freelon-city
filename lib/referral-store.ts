/**
 * Referrer ledger. Tracks who invited whom into FREELON CITY.
 *
 * Upstash keys:
 *   freelon:ref:by-joiner:<handle>   = Referral (one row per joiner — first ref wins)
 *   freelon:ref:by-referrer:<handle> = JSON array of Referral (append-only)
 *
 * In-memory fallback when no Upstash env. Handles are lowercased.
 */

export type Referral = {
  referrer: string;       // X handle of inviter (lowercased)
  joiner: string;         // X handle of new user (lowercased)
  joinerAddress?: string; // populated when X-verified
  ts: number;
  rewarded: boolean;      // true once both parties credited
};

const memoryByJoiner = new Map<string, Referral>();
const memoryByReferrer = new Map<string, Referral[]>();

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY_JOINER = (handle: string) =>
  `freelon:ref:by-joiner:${handle.toLowerCase()}`;
const KEY_REFERRER = (handle: string) =>
  `freelon:ref:by-referrer:${handle.toLowerCase()}`;

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

export async function getReferral(joiner: string): Promise<Referral | null> {
  const k = joiner.toLowerCase();
  if (!hasUpstash) return memoryByJoiner.get(k) ?? null;
  try {
    const raw = (await upstash(["GET", KEY_JOINER(k)])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as Referral;
  } catch {
    return null;
  }
}

export async function listInvitedBy(referrer: string): Promise<Referral[]> {
  const k = referrer.toLowerCase();
  if (!hasUpstash) return memoryByReferrer.get(k) ?? [];
  try {
    const raw = (await upstash(["GET", KEY_REFERRER(k)])) as string | null;
    if (!raw) return [];
    return JSON.parse(raw) as Referral[];
  } catch {
    return [];
  }
}

export async function setReferrer(
  joiner: string,
  referrer: string,
): Promise<Referral | null> {
  const j = joiner.toLowerCase();
  const r = referrer.toLowerCase();
  if (!j || !r || j === r) return null;

  // First-ref-wins: if joiner already has a referrer, bail out.
  const existing = await getReferral(j);
  if (existing) return null;

  const row: Referral = {
    referrer: r,
    joiner: j,
    ts: Date.now(),
    rewarded: false,
  };

  if (!hasUpstash) {
    memoryByJoiner.set(j, row);
    const arr = memoryByReferrer.get(r) ?? [];
    arr.push(row);
    memoryByReferrer.set(r, arr);
    return row;
  }

  try {
    await upstash(["SET", KEY_JOINER(j), JSON.stringify(row)]);
    const prev = (await upstash(["GET", KEY_REFERRER(r)])) as string | null;
    const arr: Referral[] = prev ? (JSON.parse(prev) as Referral[]) : [];
    arr.push(row);
    await upstash(["SET", KEY_REFERRER(r), JSON.stringify(arr)]);
    return row;
  } catch {
    return null;
  }
}

export async function markRewarded(joiner: string): Promise<void> {
  const j = joiner.toLowerCase();
  const row = await getReferral(j);
  if (!row || row.rewarded) return;
  row.rewarded = true;

  if (!hasUpstash) {
    memoryByJoiner.set(j, row);
    const arr = memoryByReferrer.get(row.referrer) ?? [];
    const idx = arr.findIndex((x) => x.joiner === j);
    if (idx >= 0) arr[idx] = row;
    memoryByReferrer.set(row.referrer, arr);
    return;
  }

  try {
    await upstash(["SET", KEY_JOINER(j), JSON.stringify(row)]);
    const prev = (await upstash(["GET", KEY_REFERRER(row.referrer)])) as
      | string
      | null;
    const arr: Referral[] = prev ? (JSON.parse(prev) as Referral[]) : [];
    const idx = arr.findIndex((x) => x.joiner === j);
    if (idx >= 0) {
      arr[idx] = row;
      await upstash([
        "SET",
        KEY_REFERRER(row.referrer),
        JSON.stringify(arr),
      ]);
    }
  } catch {
    // best-effort
  }
}

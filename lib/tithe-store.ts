/**
 * Tithe = burn hex + name on a civilization's "Patrons" wall for 7 days.
 * Tithes are sorted by burn amount desc within each civ. Expired tithes
 * are filtered out at read time.
 */

export type Tithe = {
  id: string;
  civ: string;
  payerKey: string;     // wallet (0x…) or `handle:<name>`
  display: string;      // pretty name shown on the wall
  amount: number;
  burnedAt: number;
  expiresAt: number;
};

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_TITHE = 100;

const memory = new Map<string, Tithe[]>(); // civ → list
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY = (civ: string) => `freelon:tithes:v1:${civ.toLowerCase()}`;

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

async function readList(civ: string): Promise<Tithe[]> {
  if (!hasUpstash) return memory.get(civ.toLowerCase()) ?? [];
  try {
    const raw = (await upstash(["GET", KEY(civ)])) as string | null;
    if (!raw) return [];
    return JSON.parse(raw) as Tithe[];
  } catch {
    return [];
  }
}

async function writeList(civ: string, list: Tithe[]): Promise<void> {
  if (!hasUpstash) {
    memory.set(civ.toLowerCase(), list);
    return;
  }
  await upstash(["SET", KEY(civ), JSON.stringify(list)]);
}

export function isValidTitheAmount(n: number): boolean {
  return Number.isFinite(n) && Number.isInteger(n) && n >= MIN_TITHE;
}

export const MIN_TITHE_AMOUNT = MIN_TITHE;

export async function addTithe(t: Omit<Tithe, "id" | "burnedAt" | "expiresAt">): Promise<Tithe> {
  if (!isValidTitheAmount(t.amount)) {
    throw new Error(`tithe must be integer ≥ ${MIN_TITHE}`);
  }
  const now = Date.now();
  const rec: Tithe = {
    ...t,
    civ: t.civ.toLowerCase(),
    id: `${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    burnedAt: now,
    expiresAt: now + TTL_MS,
  };
  const list = await readList(rec.civ);
  list.push(rec);
  // Keep at most last 500 active per civ
  const trimmed = list.filter((x) => x.expiresAt > now).slice(-500);
  await writeList(rec.civ, trimmed);
  return rec;
}

export async function getActiveTithes(civ: string): Promise<Tithe[]> {
  const now = Date.now();
  const list = await readList(civ);
  return list
    .filter((t) => t.expiresAt > now)
    .sort((a, b) => b.amount - a.amount || b.burnedAt - a.burnedAt);
}

export async function getAllActive(): Promise<Record<string, Tithe[]>> {
  // For the public /patrons page — read all 10 civs in parallel
  const { CIVILIZATIONS } = await import("@/lib/constants");
  const slugs = Object.keys(CIVILIZATIONS);
  const lists = await Promise.all(slugs.map((s) => getActiveTithes(s)));
  const out: Record<string, Tithe[]> = {};
  slugs.forEach((s, i) => (out[s] = lists[i]));
  return out;
}

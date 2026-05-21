/**
 * Server-side daily-claim ledger. Keyed by lowercased wallet address.
 * One claim per UTC day. In-memory for dev, Upstash REST in prod.
 */

const memory = new Map<string, string>(); // addr → YYYY-MM-DD
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY = (addr: string) => `freelon:claim:v1:${addr.toLowerCase()}`;

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

export function todayUTC(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export async function getLastClaim(addr: string): Promise<string | null> {
  if (!hasUpstash) return memory.get(addr.toLowerCase()) ?? null;
  const raw = (await upstash(["GET", KEY(addr)])) as string | null;
  return raw ?? null;
}

export async function setLastClaim(addr: string, day: string): Promise<void> {
  if (!hasUpstash) {
    memory.set(addr.toLowerCase(), day);
    return;
  }
  await upstash(["SET", KEY(addr), day]);
}

export async function canClaimToday(addr: string): Promise<boolean> {
  const last = await getLastClaim(addr);
  return last !== todayUTC();
}

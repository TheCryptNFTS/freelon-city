/**
 * Civilization Mayor broadcast store. Each civ has at most one active broadcast.
 * In-memory fallback for dev, Upstash REST in prod. 30-day TTL via SETEX.
 *
 * Keyed by `freelon:broadcast:v1:<civ-slug>`.
 */

export type Broadcast = {
  text: string;
  setBy: string;
  setAt: number;
};

const memory = new Map<string, Broadcast>();
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY = (civ: string) => `freelon:broadcast:v1:${civ.toLowerCase()}`;

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

export async function getBroadcast(civ: string): Promise<Broadcast | null> {
  if (!hasUpstash) return memory.get(civ.toLowerCase()) ?? null;
  try {
    const raw = (await upstash(["GET", KEY(civ)])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as Broadcast;
  } catch {
    return null;
  }
}

export async function setBroadcast(
  civ: string,
  text: string,
  setBy: string,
): Promise<void> {
  const rec: Broadcast = {
    text,
    setBy: setBy.toLowerCase(),
    setAt: Date.now(),
  };
  if (!hasUpstash) {
    memory.set(civ.toLowerCase(), rec);
    return;
  }
  // 30-day TTL
  await upstash(["SETEX", KEY(civ), "2592000", JSON.stringify(rec)]);
}

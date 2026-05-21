/**
 * Custom display-name registry for citizens.
 * Holders sign a message, server verifies signature + ownership, name is stored.
 *
 * In-memory for dev. Upstash REST for prod.
 */

export type NameRecord = { name: string; owner: string; setAt: number };

const memory = new Map<number, NameRecord>();
const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const KEY = (id: number) => `freelon:name:v1:${id}`;

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

export async function getName(citizenId: number): Promise<NameRecord | null> {
  if (!hasUpstash) return memory.get(citizenId) ?? null;
  const raw = (await upstash(["GET", KEY(citizenId)])) as string | null;
  if (!raw) return null;
  try { return JSON.parse(raw) as NameRecord; } catch { return null; }
}

export async function setName(citizenId: number, name: string, owner: string): Promise<void> {
  const rec: NameRecord = { name, owner: owner.toLowerCase(), setAt: Date.now() };
  if (!hasUpstash) { memory.set(citizenId, rec); return; }
  await upstash(["SET", KEY(citizenId), JSON.stringify(rec)]);
}

const NAME_RE = /^[A-Za-z0-9 _-]{1,32}$/;
export function validName(name: string): boolean {
  if (typeof name !== "string") return false;
  if (name !== name.trim()) return false;
  return NAME_RE.test(name);
}

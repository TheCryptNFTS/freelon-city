/**
 * X (Twitter) verified-account store. Keyed by lowercased wallet OR by carrier handle.
 * In-memory for dev, Upstash REST in prod.
 */

export type XVerification = {
  xId: string;
  xHandle: string;
  verifiedAt: number;
};

const memory = new Map<string, XVerification>();
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY = (key: string) => `freelon:x:v1:${key.toLowerCase()}`;
const HANDLE_KEY = (xHandle: string) => `freelon:x:v1:handle:${xHandle.toLowerCase()}`;

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

export async function getXVerification(key: string): Promise<XVerification | null> {
  if (!hasUpstash) return memory.get(key.toLowerCase()) ?? null;
  try {
    const raw = (await upstash(["GET", KEY(key)])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as XVerification;
  } catch {
    return null;
  }
}

export async function setXVerification(
  key: string,
  v: XVerification,
): Promise<void> {
  if (!hasUpstash) {
    memory.set(key.toLowerCase(), v);
    memory.set(`handle:${v.xHandle.toLowerCase()}`, v);
    return;
  }
  // 30-day TTL
  await upstash(["SETEX", KEY(key), "2592000", JSON.stringify(v)]);
  await upstash(["SETEX", HANDLE_KEY(v.xHandle), "2592000", JSON.stringify(v)]);
}

export async function getByHandle(xHandle: string): Promise<XVerification | null> {
  if (!hasUpstash) return memory.get(`handle:${xHandle.toLowerCase()}`) ?? null;
  try {
    const raw = (await upstash(["GET", HANDLE_KEY(xHandle)])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as XVerification;
  } catch {
    return null;
  }
}

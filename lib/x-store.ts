/**
 * X (Twitter) verified-account store. Keyed by lowercased wallet OR by carrier handle.
 * In-memory for dev, Upstash REST in prod.
 */

export type XVerification = {
  xId: string;
  xHandle: string;
  verifiedAt: number;
  // The bind key originally passed to setXVerification — usually the wallet
  // address (lowercased) when verification flows from a wallet sign-in.
  // Optional for forward compat with older records that lack it.
  bind?: string;
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
  // Persist the original bind on the record so getByHandle can resolve
  // back to the wallet (when the bind was a wallet).
  const enriched: XVerification = { ...v, bind: key.toLowerCase() };
  if (!hasUpstash) {
    memory.set(key.toLowerCase(), enriched);
    memory.set(`handle:${enriched.xHandle.toLowerCase()}`, enriched);
    return;
  }
  // 30-day TTL
  await upstash(["SETEX", KEY(key), "2592000", JSON.stringify(enriched)]);
  await upstash(["SETEX", HANDLE_KEY(enriched.xHandle), "2592000", JSON.stringify(enriched)]);
}

/**
 * Resolve an X handle to its bound wallet address, if the verification was
 * performed from a wallet (i.e. bind starts with 0x). Returns null if the
 * handle is unverified or was bound to a non-wallet key.
 */
export async function getWalletByHandle(xHandle: string): Promise<string | null> {
  const v = await getByHandle(xHandle);
  if (!v) return null;
  const bind = v.bind;
  if (!bind) return null;
  if (!/^0x[a-f0-9]{40}$/i.test(bind)) return null;
  return bind.toLowerCase();
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

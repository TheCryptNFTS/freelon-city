/**
 * Shared Upstash Redis REST client.
 *
 * 2026-05-29 — this exact helper was copy-pasted, byte-identical, into 32
 * store files. Centralizing it means a single place to tune timeouts, add
 * retries, or change error handling. Behavior is unchanged from the copies:
 * fire a REST command, throw on non-2xx, return the `result` field.
 *
 * NOTE: this does NOT touch Redis KEY strings — those stay defined in each
 * store, because changing a key string would orphan live production data.
 * This only dedupes the transport.
 *
 * `hasUpstash` is the canonical "is Upstash configured?" flag every store
 * branches on to fall back to its in-memory Map in dev.
 */

export const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

export async function upstash(cmd: string[]): Promise<unknown> {
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

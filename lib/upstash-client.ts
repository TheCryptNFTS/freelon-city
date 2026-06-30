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
  // Upstash REST signals COMMAND/DB errors (e.g. "database has been temporarily
  // rate-limited", "value is not an integer") as HTTP 200 with an `error` field
  // and NO `result`. Returning that silently as `undefined` is how callers ended
  // up doing Number(undefined)=NaN (rate-limit.ts → permanent 429). Throw so the
  // caller's catch/fallback engages — the in-memory limiter, the `.catch(()=>0)`
  // store defaults, etc. A genuine key-miss is `{"result":null}` (no `error`),
  // which still returns null, not a throw.
  const j = (await res.json()) as { result?: unknown; error?: string };
  if (typeof j.error === "string" && j.error) throw new Error(`Upstash: ${j.error}`);
  return j.result;
}

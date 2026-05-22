/**
 * fetch() with a hard timeout. Prevents inline pipelines (sweep, holder tick,
 * floor defender) from hanging the request indefinitely when OpenSea is slow.
 * Returns the Response, or throws on timeout/error.
 */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 5000, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(input, { ...rest, signal: ctrl.signal });
    return r;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * CORS for the cross-origin Crypt game SPA.
 *
 * The auth + match routes are called from the game's own origin
 * (`CRYPT_GAME_ORIGIN`, e.g. http://localhost:5173 in dev,
 * https://play.freeloncity.com in prod). The env var may be a single origin OR
 * a comma-separated allow-list (so dev, prod, and SPA preview deploys can all be
 * permitted at once). We reflect ONLY an exactly-matching allow-listed origin —
 * never `*` — because these routes carry an Authorization bearer and we must not
 * open them to arbitrary sites.
 *
 * (The public /api/owned-cards route keeps its own `*` GET — that payload is
 * public on-chain data with no auth, so a wildcard is safe there only.)
 */

function allowedOrigin(req: Request): string | null {
  const configured = process.env.CRYPT_GAME_ORIGIN;
  if (!configured) return null;
  // Single origin OR comma-separated allow-list (dev + prod + previews).
  const list = configured
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return null;
  const origin = req.headers.get("origin");
  // Reflect the request origin only when it exactly matches an allow-listed one.
  if (origin && list.includes(origin)) return origin;
  // No Origin header (non-browser caller) → echo the FIRST configured origin so
  // a direct curl during dev still gets usable headers; bearer auth is the real
  // gate. We still never send `*`.
  if (!origin) return list[0];
  return null;
}

export function gameCorsHeaders(req: Request): Record<string, string> {
  const origin = allowedOrigin(req);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

/** Standard preflight response for the game routes. */
export function gameOptions(req: Request): Response {
  return new Response(null, { status: 204, headers: gameCorsHeaders(req) });
}

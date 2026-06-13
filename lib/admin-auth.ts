import crypto from "node:crypto";

/**
 * Constant-time auth check for /api/admin/* routes.
 *
 * Reads the key from the `x-admin-key` HEADER ONLY — never the query string.
 * A `?key=` secret on a route (especially a GET) leaks into Vercel/CDN/proxy
 * access logs, browser history, and Referer headers; header-only keeps it out
 * of all of those. Comparison is constant-time (timingSafeEqual after a length
 * pre-check), mirroring app/api/admin/credit/route.ts.
 *
 * Returns false when ADMIN_SEED_KEY is unset (callers still 404 separately to
 * keep the "disabled" surface) or when the supplied header doesn't match.
 */
export function adminKeyAuthed(req: Request): boolean {
  const expected = process.env.ADMIN_SEED_KEY;
  if (!expected) return false;
  const got = req.headers.get("x-admin-key") || "";
  if (got.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}

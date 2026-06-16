import crypto from "node:crypto";

/**
 * Constant-time Bearer check for /api/cron/* routes. Compares the `authorization`
 * header to `Bearer ${CRON_SECRET}` with crypto.timingSafeEqual after a length
 * pre-check; fail-closed when CRON_SECRET is unset. Replaces per-route `!==`
 * comparisons (timing-leaky) — mirrors lib/admin-auth.ts. (2026-06-16 red-team L2.)
 */
export function cronAuthed(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = authHeader || "";
  const expected = `Bearer ${secret}`;
  if (got.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}

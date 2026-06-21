/**
 * Single source of truth for the "Guard the Pot" promotion gate.
 *
 * Guard the Pot is a sweepstakes-shaped PAID game whose Official Rules are still
 * a DRAFT pending counsel. Every surface that exposes it — the /play card, the
 * /play/guard route, the /legal/guard-the-pot-rules page, and the footer link —
 * must open and close together. Keeping the check in one place stops a new
 * surface (like the footer link that briefly 404'd) from drifting out of sync.
 *
 * Off unless GUARD_POT_LIVE is exactly "true" (a stray "false"/"1" reads as off).
 */
export function isGuardPotLive(): boolean {
  return process.env.GUARD_POT_LIVE === "true";
}

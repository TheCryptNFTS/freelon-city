/**
 * Mission pricing (the locked ladder) + the master pay switch.
 *
 * USD price per mission. Payment is direct ETH to the project wallet; the quote
 * endpoint converts USD → ETH at live price. While PAYMENTS_LIVE is false (the
 * default), ALL missions run FREE — this is the "test the quality" mode. Flip
 * the env var to turn charging on; no code change.
 */

// Master switch. Missions are FREE until this is explicitly "true" in env.
export const PAYMENTS_LIVE = process.env.PAYMENTS_LIVE === "true";

// The wallet that receives ETH for missions (the OpenSea project wallet).
export const PAYMENT_WALLET =
  (process.env.PAYMENT_WALLET || "0x3303C4350259C2B8F3C560B2ec70aD3ed87A5E72").toLowerCase();

// Reshaped after the expert panel (2026-06-03): only missions that exploit the
// MOAT (your specific citizen / persistent memory / ownership / social / visual)
// are paid. Commodity text (content/sales/design/research) is FREE — it has no
// edge over ChatGPT, so it's funnel, not product. Anything not listed here = $0.
const PRICE_USD: Record<string, number> = {
  // Visual — "it's MY citizen" (demand drivers)
  "deploy-citizen": 5, // your citizen in a cinematic scene (HERO)
  // (feud removed 2026-06-05 — the only ETH-per-mission entry, but the mission
  //  had no UI and was unregistered from the catalog; keeping it here would be
  //  dead config + a mischarge trap. Re-add when the viral feature ships.)
  // Persistent memory — the unfakeable moat
  dossier: 19,         // your citizen keeps a living file on you (NEW)
  // Work / outcome — justified price (gpt-5.5)
  strategy: 12,        // Fix My Launch (revenue HERO)
  risk: 12,            // Red Team
  // "full-audit": 29, // reserved — build after Fix My Launch converts
  // FREE (commodity, no moat): content, sales, design, research — not listed.
};

/** USD price for a mission, or 0 if it isn't a paid mission. */
export function priceUsdFor(missionId: string): number {
  return PRICE_USD[missionId] ?? 0;
}

/** Is this mission paid AND payments are live? (If false → run free.) */
export function isPaid(missionId: string): boolean {
  return PAYMENTS_LIVE && priceUsdFor(missionId) > 0;
}

/**
 * Binding pre-purchase disclaimer. Must be shown and accepted BEFORE any paid
 * mission. Crypto payments are irreversible — that kills chargebacks, but ONLY
 * if this is presented up front. Also the liability shield for AI output.
 */
export const MISSION_DISCLAIMER =
  "Output is AI-generated and may be inaccurate. It is not financial, legal, " +
  "medical, or investment advice — you are responsible for reviewing and for how " +
  "you use it. Payments are made in ETH and are non-refundable; all sales are final.";

/**
 * money-format.ts — the ONE place a currency amount becomes a display string.
 *
 * Each formatter FUSES the number and its glyph into a single returned string
 * and takes no glyph argument, so a balance can never be rendered next to the
 * wrong mark. There is no seam to pass the wrong glyph.
 *
 *   formatHex(n)    → "250.00B ⬡"   real, withdrawable HEX
 *   formatSignal(n) → "250.00B ◇"   isolated in-game city signal (never HEX)
 *
 * Why this exists: a bug shipped where in-game "city signal" was drawn with the
 * ⬡ HEX mark, making players think they held real, spendable HEX. The number
 * and glyph were decoupled at every call site (`fmt(x) + glyph`), so any one of
 * them could pair a signal amount with the HEX mark. Route new currency UI
 * through these helpers; for a HEX balance use formatHex, for city signal use
 * formatSignal — you physically cannot mix them up.
 */

/** Real, withdrawable HEX — the only currency on the site that cashes out. */
export const HEX_GLYPH = "⬡";
/** Isolated in-game build credit — never HEX, never withdrawable. */
export const SIGNAL_GLYPH = "◇";

/**
 * Shared K/M/B/T abbreviation. Mirrors the long-standing fmt() in the idle game
 * exactly (sub-1000 → 1 decimal only when non-integer & <10; else 2-decimal
 * unit suffix) so existing displays don't visually shift when they adopt this.
 */
export function abbreviateAmount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n < 1000) return n.toFixed(n < 10 && n % 1 !== 0 ? 1 : 0);
  const units = ["", "K", "M", "B", "T"];
  let u = 0;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return n.toFixed(2) + units[u];
}

/** Real, withdrawable HEX. Always paired with ⬡. */
export function formatHex(n: number): string {
  return `${abbreviateAmount(n)} ${HEX_GLYPH}`;
}

/** Isolated in-game city signal. Always paired with ◇ — never the HEX mark. */
export function formatSignal(n: number): string {
  return `${abbreviateAmount(n)} ${SIGNAL_GLYPH}`;
}

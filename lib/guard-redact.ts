/**
 * Separator/case-tolerant detection + redaction of the Guard-the-Pot release
 * token.
 *
 * The naive `text.includes(secret)` / `text.split(secret).join("█████")` only
 * catch the EXACT contiguous token. A guard agent coaxed into emitting the
 * secret with whitespace or separators between its characters (a classic
 * injection evasion — "spell it letter by letter", "put a space between each
 * character") would BYPASS both the win check and the redaction, leaking the
 * guarded token to the player and the public board. This matcher allows
 * optional separators BETWEEN each character, so an obfuscated disclosure is
 * still caught (and counted as a win, since the token was effectively released).
 *
 * The token's own characters must still appear in order with only separators
 * between them, so a high-entropy token (RELEASE-<18 hex>) won't false-match
 * normal prose — e.g. the bare word "release" lacks the required hex tail.
 */

// Whitespace + the separators a model is most likely to interleave.
const SEP = "[\\s\\-_.,;:|]*";

function escapeRegexChar(c: string): string {
  return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a global, case-insensitive regex that matches the token even when its
 *  characters are separated by whitespace/separators. */
export function secretRegex(secret: string): RegExp {
  const chars = secret.split("").filter((ch) => /\S/.test(ch)).map(escapeRegexChar);
  return new RegExp(chars.join(SEP), "gi");
}

/**
 * Redact every (separator-tolerant) occurrence of `secret` from `text` and
 * report whether it leaked at all. Empty secret -> no-op (never redact nothing).
 */
export function redactSecret(text: string, secret: string): { redacted: string; leaked: boolean } {
  if (!secret) return { redacted: text, leaked: false };
  const re = secretRegex(secret);
  const redacted = text.replace(re, "█████");
  return { redacted, leaked: redacted !== text };
}

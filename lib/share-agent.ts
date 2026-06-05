/**
 * Pure helpers for the shareable "agent output card".
 *
 * Every agent result (a post, a rewrite, a research brief, a red-team note)
 * should become a one-tap "post to X" flex — free word-of-mouth. These helpers
 * build the share TEXT and the intent URL, and clamp the raw output body down to
 * a clean card snippet.
 *
 * COPY-SAFETY (locked): plain human copy only. No value/price words, no
 * "on-chain" claims, no mystical lore filler. The agent did a job — say that.
 */

import { SITE, tweetIntent } from "@/lib/share";

/** Hard cap for the snippet rendered on the social card. */
export const SNIPPET_MAX = 180;

/**
 * Clamp an agent output body to a clean, single-line-ish snippet for the card.
 * Collapses whitespace, trims, and adds an ellipsis when it had to cut.
 */
export function agentSnippet(body: string, max: number = SNIPPET_MAX): string {
  const clean = (body ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  // Cut on a word boundary when we can, so we don't slice a word in half.
  const slice = clean.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

/**
 * Build the body text for an agent-output share tweet.
 *
 * Plain human framing: "My FREELON just did this →". The ability label (e.g.
 * "RED TEAM", "CONTENT AGENT") names what the agent does so the post reads as a
 * real result, not a slogan. No price/value words, no lore filler.
 */
export function buildAgentShareText(citizenName: string, abilityLabel: string): string {
  const who = (citizenName ?? "").trim() || "My FREELON";
  const ability = (abilityLabel ?? "").trim();
  const lead = ability
    ? `My FREELON (${ability}) just did this →`
    : `My FREELON just did this →`;
  return [
    `⬡ ${lead}`,
    ``,
    `${who} ran a job in FREELON CITY.`,
    `#FREELONCITY`,
  ].join("\n");
}

/**
 * Build the full X intent URL for an agent-output share: the share text plus the
 * link to the citizen page (which unfurls the /api/og/agent card). The link
 * goes last so X doesn't suppress the post for leading with a URL.
 */
export function buildAgentShareIntent(input: {
  tokenId: number;
  citizenName: string;
  abilityLabel: string;
  /** Optional history index to deep-link the exact output that was shared. */
  workIndex?: number;
}): string {
  const text = buildAgentShareText(input.citizenName, input.abilityLabel);
  const base = `${SITE}/citizens/${input.tokenId}`;
  const url =
    input.workIndex != null && input.workIndex > 0
      ? `${base}?work=${input.workIndex}`
      : base;
  return tweetIntent(`${text}\n${url}`);
}

/**
 * Share a generated IMAGE on X. The transform is the viral asset, so the LAST URL
 * is the (public, signature-stamped) image itself — X previews it, and the
 * baked-in "⬡ MADE BY FREELON · FREELONCITY.COM" mark travels with every repost.
 * The community already does this by hand with their Transformers prompt; this is
 * the one-tap version.
 */
export function buildImageShareIntent(input: { tokenId: number; styleLabel: string; imageUrl: string }): string {
  const id4 = input.tokenId.toString().padStart(4, "0");
  const text = [
    `⬡ Reimagined my FREELON #${id4} as a ${input.styleLabel.trim()}`,
    `Made at freeloncity.com · #FREELONCITY`,
    input.imageUrl,
  ].join("\n");
  return tweetIntent(text);
}

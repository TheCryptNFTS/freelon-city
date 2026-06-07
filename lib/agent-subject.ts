/**
 * AGENT SUBJECT — the (collection, tokenId) identity an agent is bound to.
 *
 * Historically every agent was a FREELON, so the whole codebase keys agent
 * state by a bare numeric tokenId. We're widening agents to every sister
 * collection in the signal universe EXCEPT the trading-card game. This module
 * is the single source of truth for:
 *   - which collections are agentic (the TCG is excluded),
 *   - whether a (slug, tokenId) is a valid subject,
 *   - the canonical STORE KEY SUFFIX for a subject.
 *
 * BACKWARD-COMPATIBILITY IS LOAD-BEARING: FREELONS is live with real paid
 * activation/credit/HEX records keyed by bare `${tokenId}`. `subjectKey()`
 * therefore returns the bare id for freelons (so existing keys keep resolving)
 * and a `${slug}:${tokenId}` namespace for every other collection. Never change
 * the freelons branch without a data migration — it would orphan paid unlocks.
 */
import { CONNECTED_COLLECTIONS, collectionBySlug, type ConnectedCollection } from "@/lib/collections";

/** The flagship — also the historical default for every tokenId-only call site. */
export const DEFAULT_SLUG = "freelons" as const;

/** Slugs that are NOT agents (the card game stays a card game). */
export const NON_AGENTIC_SLUGS = new Set<string>(["crypttradingcards"]);

/** Every collection that gets an AI agent. Derived from the registry so adding a
 *  sister collection to lib/collections.ts is the only edit needed. */
export const AGENTIC_COLLECTIONS: ConnectedCollection[] = CONNECTED_COLLECTIONS.filter(
  (c) => !NON_AGENTIC_SLUGS.has(c.slug),
);
export const AGENTIC_SLUGS: string[] = AGENTIC_COLLECTIONS.map((c) => c.slug);

export function isAgenticCollection(slug: string): boolean {
  return !NON_AGENTIC_SLUGS.has(slug) && collectionBySlug(slug) !== null;
}

/** Known token-id upper bounds. FREELONS is a hard 4040 (fixed supply, used for
 *  the data/citizens.json index). Sister collections use a generous cap — on-chain
 *  ownership is the authoritative gate, so this only rejects obvious garbage ids. */
const SUPPLY: Record<string, number> = {
  freelons: 4040,
};
const GENEROUS_MAX = 1_000_000;

export function tokenUpperBound(slug: string): number {
  return SUPPLY[slug] ?? GENEROUS_MAX;
}

/** A (slug, tokenId) the agent system can serve. */
export type AgentSubject = { slug: string; tokenId: number };

export function isValidToken(slug: string, tokenId: number): boolean {
  if (!isAgenticCollection(slug)) return false;
  return Number.isInteger(tokenId) && tokenId >= 1 && tokenId <= tokenUpperBound(slug);
}

/**
 * Canonical key SUFFIX for a subject, used by every agent store (unlock, credits,
 * history, threads, gallery, progression). freelons → bare id (backward-compatible
 * with all live records); every other collection → namespaced.
 */
export function subjectKey(slug: string, tokenId: number): string {
  return slug === DEFAULT_SLUG ? `${tokenId}` : `${slug}:${tokenId}`;
}

/** Inverse of subjectKey — parse a stored suffix back into a subject. */
export function parseSubjectKey(key: string): AgentSubject {
  const i = key.lastIndexOf(":");
  if (i === -1) return { slug: DEFAULT_SLUG, tokenId: Number(key) };
  return { slug: key.slice(0, i), tokenId: Number(key.slice(i + 1)) };
}

/**
 * WALLET ARTEFACTS — the holder's actual owned tokens across the five SISTER
 * collections (The Crypt · Crypt TCG · OOGIES · Emile · SMILES), enriched with art
 * + traits so the passport can render them as FREELON-grade cards instead of a bare
 * "held: N" chip. FREELONS is intentionally excluded — the passport already has a
 * dedicated, polished "CITIZENS OWNED" gallery for it.
 *
 * Data flow: OpenSea v2 account endpoint gives the owned token IDENTIFIERS per
 * collection (multi-chain — OOGIES is ApeChain); we then look up each token's
 * name/image/traits from the ingested data/collections/<slug>.json (authoritative,
 * full trait set). Read-only: mints no hex, writes no ledger — safe under the locked
 * economy-isolation rule. Same fail-safe discipline as signal-set.ts: a failed lookup
 * is `unknown`, never a confirmed zero, and unknown/empty results are not cached.
 */

import { CONNECTED_COLLECTIONS, type ArchiveRole } from "@/lib/collections";
import { COLLECTION_META, loadCollection, type Token } from "@/lib/collections-data";
import { normalizeAddress } from "@/lib/wallet-tokens";
import { openseaFetch } from "@/lib/opensea-fetch";

/** Owned-token previews shown per collection (the rest roll into "+N more"). */
const PREVIEW_CAP = 6;
/** How many of the holder's tokens to pull from OpenSea (for the count + preview). */
const FETCH_LIMIT = 50;

export type ArtefactToken = {
  id: string;
  name: string;
  img: string;
  /** A few display traits (type/value), prioritised toward the meaningful ones. */
  traits: { type: string; value: string }[];
};

export type ArtefactGroup = {
  slug: string;
  name: string;
  role: ArchiveRole;
  color: string;
  /** Short uppercase lore line + epithet from COLLECTION_META (for the header). */
  epithet: string;
  blurb: string;
  /** Tokens held (capped at FETCH_LIMIT for display; "+N more" beyond PREVIEW_CAP). */
  count: number;
  has: boolean;
  /** Lookup failed — value unknown, NOT a confirmed zero. */
  unknown: boolean;
  /** Up to PREVIEW_CAP enriched owned tokens. */
  preview: ArtefactToken[];
};

const SISTERS = CONNECTED_COLLECTIONS.filter((c) => c.slug !== "freelons");

// Traits worth surfacing first when a collection has many — keeps the card
// informative without dumping all 16 of Emile's facets. Case-insensitive.
const PRIORITY_TRAITS = ["rarity", "grade", "faction", "type", "category", "core archetype", "series", "aura", "background", "backgrounds"];

function pickTraits(traits: Record<string, string> | undefined): { type: string; value: string }[] {
  if (!traits) return [];
  const entries = Object.entries(traits).filter(([, v]) => v != null && String(v).trim() !== "");
  entries.sort((a, b) => {
    const ai = PRIORITY_TRAITS.indexOf(a[0].toLowerCase());
    const bi = PRIORITY_TRAITS.indexOf(b[0].toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return entries.slice(0, 3).map(([type, value]) => ({ type, value: String(value) }));
}

// ── Per-collection id→token index (built once per process, ~1-2MB files) ──
const indexCache = new Map<string, Map<string, Token>>();
function collectionIndex(slug: string): Map<string, Token> {
  const cached = indexCache.get(slug);
  if (cached) return cached;
  const idx = new Map<string, Token>();
  try {
    for (const t of loadCollection(slug).tokens) idx.set(String(t.id), t);
  } catch {
    /* missing file → empty index; enrichment falls back to OpenSea image below */
  }
  indexCache.set(slug, idx);
  return idx;
}

type OsNft = { contract?: string; identifier?: string; name?: string; image_url?: string; display_image_url?: string };
type OsNftsResponse = { nfts?: OsNft[] };

/** Owned token IDs (+ OpenSea image fallback) for one collection. null = unknown. */
async function osOwned(
  addr: string,
  chain: string,
  slug: string,
  contract: string,
): Promise<OsNft[] | null> {
  const url =
    `https://api.opensea.io/api/v2/chain/${chain}/account/${addr}` +
    `/nfts?collection=${encodeURIComponent(slug)}&limit=${FETCH_LIMIT}`;
  const res = await openseaFetch<OsNftsResponse>(url, { revalidate: 60 });
  if (!res.ok) return null;
  return (res.data.nfts || []).filter((n) => (n.contract || "").toLowerCase() === contract.toLowerCase());
}

// ── Per-wallet cache (positive, fully-resolved only — mirrors signal-set) ──
type CacheEntry = { value: ArtefactGroup[]; expires: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60_000;

/**
 * Resolve the holder's owned tokens across the five sister collections, enriched
 * for display. Returns one group per collection (held or not). Unknown lookups are
 * marked `unknown` and the result is NOT cached (so a transient OpenSea blip never
 * sticks as an empty gallery).
 */
export async function getWalletArtefacts(address: string): Promise<ArtefactGroup[]> {
  const norm = normalizeAddress(address);
  if (!norm) {
    return SISTERS.map((c) => emptyGroup(c.slug, c.name, c.role, c.color, false));
  }

  const hit = cache.get(norm);
  if (hit && hit.expires > Date.now()) return hit.value;

  const groups = await Promise.all(
    SISTERS.map(async (c): Promise<ArtefactGroup> => {
      const owned = await osOwned(norm, c.chain, c.slug, c.contract);
      if (owned === null) return emptyGroup(c.slug, c.name, c.role, c.color, true);

      const idx = collectionIndex(c.slug);
      const preview: ArtefactToken[] = owned.slice(0, PREVIEW_CAP).map((n) => {
        const id = String(n.identifier ?? "");
        const local = idx.get(id);
        return {
          id,
          name: local?.name || n.name || `${c.name} #${id}`,
          img: local?.img || n.display_image_url || n.image_url || "",
          traits: pickTraits(local?.traits),
        };
      });
      const meta = COLLECTION_META[c.slug];
      return {
        slug: c.slug,
        name: c.name,
        role: c.role,
        color: c.color,
        epithet: meta?.epithet ?? "",
        blurb: meta?.blurb ?? "",
        count: owned.length,
        has: owned.length > 0,
        unknown: false,
        preview,
      };
    }),
  );

  // Cache only when fully resolved (no unknowns) — never pin a provisional result.
  if (!groups.some((g) => g.unknown)) {
    cache.set(norm, { value: groups, expires: Date.now() + TTL_MS });
    if (cache.size > 5000) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
  }
  return groups;
}

function emptyGroup(slug: string, name: string, role: ArchiveRole, color: string, unknown: boolean): ArtefactGroup {
  const meta = COLLECTION_META[slug];
  return { slug, name, role, color, epithet: meta?.epithet ?? "", blurb: meta?.blurb ?? "", count: 0, has: false, unknown, preview: [] };
}

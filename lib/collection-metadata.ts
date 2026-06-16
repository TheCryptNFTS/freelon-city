/**
 * POLISHED TOKEN METADATA for the five sister collections — the body a wallet /
 * marketplace renders if its contract's baseURI is pointed at
 * /api/collection-metadata/<slug>/. Built from the ingested, authoritative token data
 * (data/collections/<slug>.json — original art + full traits) plus the FREELON CITY
 * lore from COLLECTION_META, so flipping baseURI keeps every token's ART and TRAITS
 * byte-identical and ONLY adds: a richer name, a lore description, the full attribute
 * set, and an external_url back to the city. No financial/value claims (copy-safe).
 *
 * SAFETY: the `image` is always the token's ORIGINAL art — pointing a contract here
 * never changes what a token looks like, only enriches the surrounding info.
 */
import { COLLECTION_META, loadCollection, type Token } from "@/lib/collections-data";
import { collectionBySlug } from "@/lib/collections";

export type TokenMetadata = {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: { trait_type: string; value: string | number }[];
};

// Per-collection id→token index, built once per process (files are 0.1–1.8MB).
const indexCache = new Map<string, Map<string, Token>>();
function index(slug: string): Map<string, Token> | null {
  const cached = indexCache.get(slug);
  if (cached) return cached;
  let idx: Map<string, Token>;
  try {
    idx = new Map(loadCollection(slug).tokens.map((t) => [String(t.id), t]));
  } catch {
    return null; // unknown / missing collection file
  }
  indexCache.set(slug, idx);
  return idx;
}

const SITE = "https://www.freeloncity.com";

/**
 * Build the polished metadata for one token, or null if the slug/token is unknown
 * (caller should fail SAFE — a clear 503/404, never a broken 200 body).
 */
export function buildTokenMetadata(slug: string, id: string): TokenMetadata | null {
  const meta = COLLECTION_META[slug];
  const coll = collectionBySlug(slug);
  if (!meta || !coll) return null;
  const idx = index(slug);
  if (!idx) return null;
  const t = idx.get(String(id));
  if (!t) return null;

  const attributes = Object.entries(t.traits || {})
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([trait_type, value]) => ({ trait_type, value: String(value) }));

  const name = t.name || `${meta.title} #${id}`;
  // Lore-only description (the blurb is existing copy-safe lore). Ties the token to
  // its layer of the city without any value/return language.
  const description =
    `${meta.blurb}\n\n` +
    `${name} — ${coll.role} of FREELON CITY. ${meta.epithet} ` +
    `One artefact in a living on-chain universe of six collections.`;

  return {
    name,
    description,
    image: t.img,
    external_url: `${SITE}/collections/${slug}`,
    attributes,
  };
}

/**
 * Connected collections of the FREELON CITY signal universe.
 *
 * Six on-chain collections owned/minted from the same architect wallet
 * (per founder brief 2026-05-25). Each maps to an in-world archive
 * role surfaced on /archive.
 *
 * Contract addresses + chains resolved 2026-05-25 via OpenSea v2
 * collection endpoint. 404hexnotfound is intentionally absent — it's
 * the brand name of the FREELONS collection itself, not a separate
 * contract.
 */

export type ArchiveRole =
  | "Citizens"        // FREELONS — root signal
  | "Dead Signals"    // The Crypt
  | "Combat Relics"   // Crypt Trading Cards (gods + commanders)
  | "Ancient Species" // OOGIES
  | "Memory Fragments"// Emile
  | "Collapse Records"; // SMILES

export type ConnectedCollection = {
  /** OpenSea slug — used in `/v2/collections/{slug}` + `?collection={slug}` */
  slug: string;
  /** ERC-721 contract address (lowercase). */
  contract: string;
  /** Chain — must match OpenSea v2 path. ethereum | ape_chain | etc. */
  chain: "ethereum" | "ape_chain";
  /** Display name in the archive UI. */
  name: string;
  /** In-world classification — drives the result group label. */
  role: ArchiveRole;
  /** Brand color (CSS var) for the archive card. */
  color: string;
};

export const CONNECTED_COLLECTIONS: ConnectedCollection[] = [
  {
    slug: "freelons",
    contract: "0xa79e73c9828db3fcd7c77be7d9f356fb684b5504",
    chain: "ethereum",
    name: "FREELON CITY",
    role: "Citizens",
    color: "var(--gold)",
  },
  {
    slug: "the-crypt-official",
    contract: "0x06827dea49f5ff963bf15beb7cfc3b211c50b41c",
    chain: "ethereum",
    name: "The Crypt",
    role: "Dead Signals",
    color: "var(--gold-bright)",
  },
  {
    slug: "crypttradingcards",
    contract: "0x48fd513c9f8ca591ffada7223a261ffc6e797394",
    chain: "ethereum",
    name: "Crypt TCG",
    role: "Combat Relics",
    color: "var(--void-purple)",
  },
  {
    slug: "oogies",
    contract: "0x214cae51c3bae88515aaefd8e1867e64502b0342",
    chain: "ape_chain",
    name: "OOGIES",
    role: "Ancient Species",
    color: "var(--ink)",
  },
  {
    slug: "emile0x1908",
    contract: "0xec4d0a5afc903261e99b6d382ffcacc02d18ae16",
    chain: "ethereum",
    name: "Emile",
    role: "Memory Fragments",
    color: "var(--gold-deep)",
  },
  {
    slug: "smiles-genesis",
    contract: "0x30ac46575d2f3474edc79b084088819805e1ef42",
    chain: "ethereum",
    name: "SMILES",
    role: "Collapse Records",
    color: "var(--signal-red)",
  },
];

export function collectionBySlug(slug: string): ConnectedCollection | null {
  return CONNECTED_COLLECTIONS.find((c) => c.slug === slug) ?? null;
}

export function openseaCollectionUrl(slug: string): string {
  return `https://opensea.io/collection/${slug}`;
}

/**
 * Server-side loader for the per-collection explorers under
 * /collections/<slug>. Each collection's full token + trait set was
 * ingested from OpenSea into data/collections/<slug>.json by
 * scripts/ingest-collections.mjs. This module loads that file, builds the
 * filterable trait facets, and exposes a small display registry (accent
 * colour, lore blurb, status) so every collection page reads like the
 * homepage archive cards instead of a raw data dump.
 *
 * Server-only (reads the filesystem). Import into Server Components.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Token = {
  id: string;
  name: string;
  img: string;
  traits: Record<string, string>;
};

export type CollectionFile = {
  slug: string;
  name: string;
  chain: string;
  contract: string;
  total: number;
  fetched: string;
  tokens: Token[];
};

/** A trait type that's useful to filter on, plus its distinct values. */
export type Facet = { type: string; values: string[] };

/**
 * Display metadata per collection — mirrors the copy/colour used on the
 * homepage archive strip (components/OtherSignalsStrip.tsx) so the universe
 * stays visually consistent. `kicker` is the short uppercase lore line.
 */
export const COLLECTION_META: Record<
  string,
  { title: string; status: string; statusColor: string; blurb: string; kicker: string }
> = {
  "the-crypt-official": {
    title: "The Crypt",
    status: "RECOVERED",
    statusColor: "var(--state-active)",
    kicker: "THE DEAD ONES · ANCIENT RECORDS",
    blurb:
      "Dead signals. Forgotten identities. Ancient records recovered beneath the city — the first signals the HEX ever caught.",
  },
  crypttradingcards: {
    title: "Combat Archives",
    status: "RECONSTRUCTING",
    statusColor: "var(--state-surge)",
    kicker: "RECOVERED BATTLE SIMULATIONS",
    blurb:
      "Recovered battle simulations from The Crypt. Every relic card is a sealed combat record — ten gods, ten civilizations, one signal.",
  },
  oogies: {
    title: "OOGIES",
    status: "FRAGMENT",
    statusColor: "var(--state-unstable)",
    kicker: "THE WILD ONES · ANCIENT SPECIES",
    blurb:
      "An ancient signal species. They heard the HEX before the city existed — fragments of a civilization that predates the collapse.",
  },
  emile0x1908: {
    title: "Emile",
    status: "DECAYING",
    statusColor: "var(--state-surge)",
    kicker: "THE EMOTIONAL ONES · MEMORY FRAGMENTS",
    blurb:
      "Memory fragments preserved before the signal collapse. Each Emile is a frozen instant — an emotion, a tool, a path not taken.",
  },
  "smiles-genesis": {
    title: "SMILES Collapse",
    status: "SEALED",
    statusColor: "var(--state-warning)",
    kicker: "THE LOST ONES · A FAILED CONTROL SYSTEM",
    blurb:
      "A failed emotional control system. 99% of the supply was destroyed in the collapse; only the sealed survivors remain in the record.",
  },
};

export const COLLECTION_SLUGS = Object.keys(COLLECTION_META);

/** Load one collection's ingested file. Throws if the slug is unknown. */
export function loadCollection(slug: string): CollectionFile {
  const path = join(process.cwd(), "data", "collections", `${slug}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as CollectionFile;
}

/**
 * Build the filterable facets from a token set. A trait type is only useful
 * as a filter when it has between 2 and MAX_FACET_VALUES distinct values —
 * single-value types (e.g. "Set") add nothing, and near-unique types (e.g.
 * "Ability" with 1300+ values) would flood the UI. Those remain reachable
 * via the free-text search box instead. Values are sorted, with a leading
 * numeric sort when they look numeric (Cost/Attack/Health) so ranges read
 * naturally.
 */
const MAX_FACET_VALUES = 100;

export function buildFacets(tokens: Token[]): Facet[] {
  const map = new Map<string, Set<string>>();
  for (const t of tokens) {
    for (const [type, value] of Object.entries(t.traits)) {
      if (!value) continue;
      if (!map.has(type)) map.set(type, new Set());
      map.get(type)!.add(value);
    }
  }
  const facets: Facet[] = [];
  for (const [type, set] of map) {
    if (set.size < 2 || set.size > MAX_FACET_VALUES) continue;
    const values = Array.from(set).sort((a, b) => {
      const na = Number(a), nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    });
    facets.push({ type, values });
  }
  // Sort facets by name for a stable, scannable order.
  facets.sort((a, b) => a.type.localeCompare(b.type));
  return facets;
}

/** OpenSea asset URL for a token, e.g. .../assets/ape_chain/0x…/3329 */
export function tokenUrl(chain: string, contract: string, id: string): string {
  return `https://opensea.io/assets/${chain}/${contract}/${id}`;
}

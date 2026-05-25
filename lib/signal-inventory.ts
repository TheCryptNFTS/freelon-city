/**
 * Signal inventory — cross-collection wallet scanner.
 *
 * Founder brief 2026-05-25: "Let users paste a wallet and see which
 * FREELON CITY archive artefacts they own across all connected
 * collections. Not an NFT marketplace. Not floor prices. An ownership
 * terminal."
 *
 * Hits OpenSea v2 `/chain/{chain}/account/{addr}/nfts?collection={slug}`
 * once per collection in parallel. Reuses openseaFetch (centralized
 * 429 backoff + key handling) per audit recommendation.
 *
 * Each collection scan is independently capped + timeout-bounded so a
 * slow chain (e.g. apechain) can't hold up the whole inventory render.
 * Failures degrade per-collection — the rest of the report still ships.
 */

import { openseaFetch } from "@/lib/opensea-fetch";
import {
  CONNECTED_COLLECTIONS,
  type ConnectedCollection,
} from "@/lib/collections";
import { isAddress } from "viem";

const PAGE_LIMIT = 50; // OpenSea v2 max items per page
const MAX_PAGES_PER_COLLECTION = 4; // ≤200 items captured per collection
const SCAN_REVALIDATE_SEC = 120; // 2-min cache per (wallet, collection)

export type ArtefactItem = {
  /** Token id as string — some chains use non-numeric ids. */
  identifier: string;
  /** Human name, falls back to "<Collection> #<id>" upstream. */
  name: string | null;
  /** Best-effort image url; null if OpenSea has none. */
  imageUrl: string | null;
  /** OpenSea token url to "view artefact". */
  openseaUrl: string;
};

export type CollectionInventory = {
  collection: ConnectedCollection;
  count: number;
  /** Truncated to first ~200 items for display. */
  items: ArtefactItem[];
  /** True if we hit the MAX_PAGES cap (more items exist beyond ours). */
  truncated: boolean;
  /** Per-collection scan status — frontend can show partial-failure pills. */
  status: "ok" | "empty" | "rate_limited" | "error";
};

export type SignalInventory = {
  address: string;
  collections: CollectionInventory[];
  scannedAt: number;
};

type RawNft = {
  identifier?: string;
  name?: string | null;
  image_url?: string | null;
  display_image_url?: string | null;
  contract?: string;
};

type AccountNftsResp = {
  nfts?: RawNft[];
  next?: string | null;
};

function tokenUrl(coll: ConnectedCollection, identifier: string): string {
  // OpenSea token URL path differs by chain. ethereum uses /ethereum,
  // apechain uses /ape_chain in the path segment after /assets/.
  const chainSeg =
    coll.chain === "ape_chain" ? "ape_chain" : "ethereum";
  return `https://opensea.io/assets/${chainSeg}/${coll.contract}/${identifier}`;
}

async function scanCollection(
  addr: string,
  coll: ConnectedCollection,
): Promise<CollectionInventory> {
  const items: ArtefactItem[] = [];
  let next: string | null = null;
  let truncated = false;
  let status: CollectionInventory["status"] = "empty";

  for (let page = 0; page < MAX_PAGES_PER_COLLECTION; page++) {
    const u = new URL(
      `https://api.opensea.io/api/v2/chain/${coll.chain}/account/${addr}/nfts`,
    );
    u.searchParams.set("collection", coll.slug);
    u.searchParams.set("limit", String(PAGE_LIMIT));
    if (next) u.searchParams.set("next", next);

    const res = await openseaFetch<AccountNftsResp>(u.toString(), {
      timeoutMs: 8000,
      revalidate: SCAN_REVALIDATE_SEC,
    });

    if (!res.ok) {
      status = res.status === 429 ? "rate_limited" : "error";
      break;
    }
    const nfts = res.data?.nfts ?? [];
    for (const nft of nfts) {
      // Defensive: OpenSea may surface NFTs from related contracts in
      // some configurations. Filter to the exact contract address.
      if (
        nft.contract &&
        nft.contract.toLowerCase() !== coll.contract.toLowerCase()
      ) {
        continue;
      }
      const id = nft.identifier;
      if (!id) continue;
      items.push({
        identifier: id,
        name: nft.name ?? null,
        imageUrl: nft.image_url ?? nft.display_image_url ?? null,
        openseaUrl: tokenUrl(coll, id),
      });
    }
    next = res.data?.next ?? null;
    if (!next) break;
    if (page === MAX_PAGES_PER_COLLECTION - 1 && next) {
      truncated = true;
    }
  }

  if (items.length > 0) status = "ok";
  return { collection: coll, count: items.length, items, truncated, status };
}

/**
 * Scan a wallet across every connected collection in parallel.
 *
 * Returns a per-collection report. Empty collections come back with
 * `status: 'empty'` rather than being filtered out so the UI can show
 * "you don't own X" cards (which can drive purchase intent).
 */
export async function scanWalletSignalInventory(
  address: string,
): Promise<SignalInventory | null> {
  if (!isAddress(address)) return null;
  const addr = address.toLowerCase();

  // Parallel — each collection is independent. Worst case is bounded by
  // the slowest one (8s timeout × max 4 pages = ~32s ceiling), but in
  // practice most return on page 1 within ~500ms.
  const results = await Promise.all(
    CONNECTED_COLLECTIONS.map((c) => scanCollection(addr, c).catch((): CollectionInventory => ({
      collection: c,
      count: 0,
      items: [],
      truncated: false,
      status: "error",
    }))),
  );

  return {
    address: addr,
    collections: results,
    scannedAt: Date.now(),
  };
}

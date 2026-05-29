import { NextResponse } from "next/server";
import { isValidAddress, normalizeAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { openseaFetch, type OpenSeaFetchResult } from "@/lib/opensea-fetch";
import { collectionBySlug } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/owned-cards?addr=0x...
 *
 * Slice 2 of the FREELON CITY ↔ Crypt TCG link. The TCG is a pure
 * client-side app with no backend and no API key, so it cannot enumerate a
 * wallet's Combat Archives token IDs itself: the `crypttradingcards`
 * contract is a plain ERC-721 (NOT ERC721Enumerable, verified on-chain), so
 * there is no `tokenOfOwnerByIndex` and the only way to list the exact ids is
 * an indexer. This endpoint is that indexer — it runs the OpenSea v2 account
 * lookup SERVER-SIDE (so the OpenSea key never ships to the client) and
 * returns the token ids the wallet holds.
 *
 * CROSS-ORIGIN BY DESIGN: the game runs on a different origin, so this route
 * sends permissive CORS headers. That is safe here and ONLY here because the
 * payload is public on-chain ownership data — no secrets, no game ledger, no
 * mutation, no faucet. (The same-origin game routes stay locked down.)
 *
 * Fail-safe discipline: a failed/blocked lookup returns `unknown: true`, never
 * an empty token list presented as a confirmed zero — an OpenSea outage must
 * not strip a real holder's deck.
 */

const SLUG = "crypttradingcards";
const MAX_PAGES = 5; // 5 × 200 = up to 1000 cards scanned per wallet
const PAGE_LIMIT = 200;

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

type OsNftsResponse = {
  nfts?: Array<{ contract?: string; identifier?: string }>;
  next?: string | null;
};

export async function GET(req: Request) {
  const rl = await limit(req, "owned-cards", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const url = new URL(req.url);
  const addr = (url.searchParams.get("addr") || "").toLowerCase();
  if (!isValidAddress(addr)) {
    return NextResponse.json(
      { error: "invalid_address" },
      { status: 400, headers: corsHeaders() },
    );
  }
  const norm = normalizeAddress(addr)!;

  const collection = collectionBySlug(SLUG);
  if (!collection) {
    return NextResponse.json(
      { error: "unknown_collection" },
      { status: 500, headers: corsHeaders() },
    );
  }
  const contract = collection.contract.toLowerCase();

  const ids = new Set<string>();
  let next: string | null = null;
  let sawFailure = false;
  let truncated = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const pageUrl: string =
      `https://api.opensea.io/api/v2/chain/${collection.chain}/account/${norm}` +
      `/nfts?collection=${encodeURIComponent(SLUG)}&limit=${PAGE_LIMIT}` +
      (next ? `&next=${encodeURIComponent(next)}` : "");

    const res: OpenSeaFetchResult<OsNftsResponse> = await openseaFetch<OsNftsResponse>(
      pageUrl,
      { revalidate: 60 },
    );
    if (!res.ok) {
      // Could not resolve this page — mark unknown if we have nothing solid yet.
      sawFailure = true;
      break;
    }

    for (const n of res.data.nfts || []) {
      if ((n.contract || "").toLowerCase() === contract && n.identifier) {
        ids.add(String(n.identifier));
      }
    }

    next = res.data.next ?? null;
    if (!next) break;
    if (page === MAX_PAGES - 1 && next) truncated = true;
  }

  // If the very first lookup failed we have no idea what they hold — report
  // unknown rather than lying with an empty deck.
  if (sawFailure && ids.size === 0) {
    return NextResponse.json(
      { address: norm, tokenIds: [], count: 0, unknown: true },
      { headers: corsHeaders() },
    );
  }

  const tokenIds = Array.from(ids);
  return NextResponse.json(
    {
      address: norm,
      tokenIds,
      count: tokenIds.length,
      truncated: truncated || sawFailure,
      unknown: false,
    },
    { headers: corsHeaders() },
  );
}

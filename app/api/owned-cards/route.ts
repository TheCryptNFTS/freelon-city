import { NextResponse } from "next/server";
import { isValidAddress, normalizeAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { openseaFetch, type OpenSeaFetchResult } from "@/lib/opensea-fetch";
import { collectionBySlug } from "@/lib/collections";
import { verifyBearer } from "@/lib/game-session";

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

/** Response contract version. The TCG client pins this; bump it on any
 *  breaking shape change so a mismatch fails loud instead of silently
 *  stripping every holder's deck. */
const CONTRACT_VERSION = 2;

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  // Authenticated branch: when a Bearer session is present we use the SESSION
  // address and ignore `?addr=`, so an authed caller can't query someone else's
  // wallet through a spoofed query param. The public `?addr=` path (no auth)
  // stays — this payload is public on-chain data, so a wildcard GET is safe.
  let addr: string;
  if (req.headers.get("authorization")) {
    const session = await verifyBearer(req);
    if (!session) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401, headers: corsHeaders() },
      );
    }
    addr = session.address;
  } else {
    addr = (url.searchParams.get("addr") || "").toLowerCase();
  }

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
      { version: CONTRACT_VERSION, address: norm, tokenIds: [], count: 0, unknown: true },
      { headers: corsHeaders() },
    );
  }

  const tokenIds = Array.from(ids);
  return NextResponse.json(
    {
      version: CONTRACT_VERSION,
      address: norm,
      tokenIds,
      count: tokenIds.length,
      // Two DISTINCT signals — do NOT conflate them:
      //  truncated  = case (A) clean cap: hit MAX_PAGES with more pages still
      //               remaining. The list is VALID, just capped at 1000. A
      //               whale with >1000 cards still has far more than the
      //               30-card deck cap, so this is harmless — never fail-close.
      //  incomplete = case (B) a page errored mid-scan but we still recovered
      //               some ids. The list is genuinely suspect/short; surface it
      //               so the client can warn instead of silently shorting.
      truncated,
      incomplete: sawFailure,
      unknown: false,
    },
    { headers: corsHeaders() },
  );
}

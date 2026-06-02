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
// Quota-burn cap: each page is one OpenSea call, so this bounds the fan-out per
// request. 3 × 200 = up to 600 cards scanned — still far above the 30-card deck
// cap, so a >600 whale is `truncated` (valid, just capped), never fail-closed.
const MAX_PAGES = 3;
const PAGE_LIMIT = 200;

/** Response contract version. The TCG client pins this; bump it on any
 *  breaking shape change so a mismatch fails loud instead of silently
 *  stripping every holder's deck. Response SHAPE is unchanged by the
 *  auth/cache/page-cap hardening, so this stays at 2. */
const CONTRACT_VERSION = 2;

/**
 * Opt-in strict mode. When OWNED_CARDS_REQUIRE_AUTH === "true" the anonymous
 * `?addr=` path is rejected (401) and a valid Bearer is REQUIRED. Default OFF
 * preserves today's public read, which the SPA depends on. Flip this ON before
 * any reward/leaderboard/stakes tie ownership to this endpoint, so a wallet
 * must SIWE-prove control instead of letting anyone enumerate any address.
 */
function requireAuth(): boolean {
  return process.env.OWNED_CARDS_REQUIRE_AUTH === "true";
}

/**
 * Short per-address in-memory cache. Repeat hits for the same wallet inside the
 * TTL return the prior result instead of re-fanning-out to OpenSea — directly
 * cuts the quota-burn amplification. Only SUCCESSFUL, non-unknown results are
 * cached; an `unknown`/failed lookup is never cached so a transient OpenSea
 * outage can't pin a real holder to an empty deck. Keyed by lowercased address
 * (already resolved from session or query), so cache reuse can't leak across
 * wallets. */
const CACHE_TTL_MS = 45_000;
type CachedBody = {
  version: number;
  address: string;
  tokenIds: string[];
  count: number;
  truncated: boolean;
  incomplete: boolean;
  unknown: boolean;
};
const ownedCache = new Map<string, { body: CachedBody; at: number }>();

function getCached(addr: string): CachedBody | null {
  const hit = ownedCache.get(addr);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    ownedCache.delete(addr);
    return null;
  }
  return hit.body;
}

function setCached(addr: string, body: CachedBody): void {
  ownedCache.set(addr, { body, at: Date.now() });
}

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
  } else if (requireAuth()) {
    // Strict mode (opt-in): no Bearer present and the anonymous path is
    // disabled — refuse rather than serving an unauthenticated lookup.
    return NextResponse.json(
      { error: "auth_required" },
      { status: 401, headers: corsHeaders() },
    );
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

  // Cache short-circuit: a fresh, confirmed prior result for this exact wallet
  // skips the OpenSea fan-out entirely.
  const cached = getCached(norm);
  if (cached) {
    return NextResponse.json(cached, { headers: corsHeaders() });
  }

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
  const body: CachedBody = {
    version: CONTRACT_VERSION,
    address: norm,
    tokenIds,
    count: tokenIds.length,
      // Two DISTINCT signals — do NOT conflate them:
      //  truncated  = case (A) clean cap: hit MAX_PAGES with more pages still
      //               remaining. The list is VALID, just capped at MAX_PAGES ×
      //               PAGE_LIMIT. A whale past the cap still has far more than
      //               the 30-card deck cap, so this is harmless — never fail-close.
      //  incomplete = case (B) a page errored mid-scan but we still recovered
      //               some ids. The list is genuinely suspect/short; surface it
      //               so the client can warn instead of silently shorting.
    truncated,
    incomplete: sawFailure,
    unknown: false,
  };

  // Cache only confirmed (non-unknown) results. A clean full scan or a clean
  // cap is safe to reuse; an `incomplete` (mid-scan error) result is still a
  // real recovered list with the warning flag preserved, so caching it for a
  // few seconds is acceptable and still cuts quota burn.
  setCached(norm, body);

  return NextResponse.json(body, { headers: corsHeaders() });
}

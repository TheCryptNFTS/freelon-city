/**
 * GET /api/metadata/[id] — the DYNAMIC tokenURI target (public, no auth).
 *
 * This is what the contract's baseURI will point at AFTER the founder flips it
 * (the flip itself is NOT done here). It is the single most safety-critical
 * route in the evolution feature: once baseURI points here, EVERY token's
 * metadata is served by this handler.
 *
 * NON-NEGOTIABLE SAFETY RULE — opt-in only:
 *   For any token that has NOT opted into evolution, the response MUST be
 *   byte-for-byte the ORIGINAL metadata. We achieve this by PROXYING the
 *   original metadata from BASE_TOKEN_URI and only overriding the `image` field
 *   when the token is evolved. So flipping baseURI changes NOTHING for anyone
 *   until they choose to evolve.
 *
 * FAIL-SAFE: if BASE_TOKEN_URI is unset, or the original fetch fails / returns
 * non-JSON, we return a clear 503 — NEVER an empty or partial body that could
 * blank a token on a marketplace. A 503 makes a marketplace retry; a broken
 * 200 would poison its cache.
 *
 * BASE_TOKEN_URI: the existing metadata base, e.g.
 *   "https://ipfs.io/ipfs/<metaCID>/"  (the original anchored metadata folder).
 * Token n's original metadata lives at `${BASE_TOKEN_URI}${n}` (the sample
 * files are named "1", "2", … with no extension — see regen/ship/wave5ship_meta).
 * A configurable suffix (BASE_TOKEN_URI_SUFFIX, e.g. ".json") is appended if set.
 */

import { NextResponse } from "next/server";
import { getEvolution } from "@/lib/evolution-store";

export const runtime = "nodejs";
// Cache sensibly: short, so a fresh evolve/revert shows up quickly, but the
// proxied original is still cached at the edge between requests.
export const revalidate = 0;

const MAX_ID = 4040;

type Metadata = {
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
  attributes?: { trait_type: string; value: string | number }[];
  [k: string]: unknown;
};

function fail503(reason: string) {
  // Clear, retryable error — never a broken metadata body.
  return NextResponse.json(
    { error: "metadata_unavailable", reason },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tokenId = Math.floor(Number(id));
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > MAX_ID) {
    return NextResponse.json({ error: "invalid token id" }, { status: 400 });
  }

  // The original anchored metadata base. Founder-configured; without it we
  // cannot safely proxy, so we fail loud (503) rather than guess.
  const base = process.env.BASE_TOKEN_URI;
  if (!base) return fail503("BASE_TOKEN_URI not configured");
  const suffix = process.env.BASE_TOKEN_URI_SUFFIX ?? "";
  const origin = `${base.replace(/\/+$/, "")}/${tokenId}${suffix}`;

  // 1) Fetch the ORIGINAL metadata (the source of truth). Timeout-guarded, with
  //    a short retry: the origin is an IPFS gateway, which transiently blips —
  //    and once baseURI points here, a single blip would 503 a token's metadata
  //    to OpenSea (blank art) with no client-side retry on the marketplace. Two
  //    quick tries turn most blips into a clean 200; still fails SAFE (503, never
  //    a broken body) if both fail.
  let original: Metadata | null = null;
  let lastReason = "origin_fetch_failed";
  for (let attempt = 0; attempt < 2 && !original; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500));
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 12_000);
      const res = await fetch(origin, { signal: c.signal, cache: "no-store" }).finally(() => clearTimeout(t));
      if (!res.ok) { lastReason = `origin_${res.status}`; continue; }
      const parsed = (await res.json()) as Metadata;
      // Guard against a non-object / empty body that would blank a token.
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) { lastReason = "origin_not_object"; continue; }
      original = parsed;
    } catch {
      lastReason = "origin_fetch_failed";
    }
  }
  if (!original) return fail503(lastReason);

  // 2) Read evolution state. On ANY store error this returns the empty record
  //    (evolved:false), so a store outage fails SAFE to the original art.
  const evo = await getEvolution(tokenId);

  // 3) Not opted in → return the ORIGINAL UNCHANGED (byte-identical intent).
  if (!evo.evolved || !evo.evolvedImageUrl) {
    return NextResponse.json(original, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  }

  // 4) Opted in → ONLY override `image`. The original is never stored-over; this
  //    override is fully reversible via revert(). We additively annotate the
  //    evolve tier as an attribute (non-destructive — appended, original kept).
  const attributes = Array.isArray(original.attributes) ? [...original.attributes] : [];
  const withoutTier = attributes.filter((a) => a?.trait_type !== "Evolution Tier");
  withoutTier.push({ trait_type: "Evolution Tier", value: evo.tier });

  const merged: Metadata = {
    ...original,
    image: evo.evolvedImageUrl,
    attributes: withoutTier,
  };
  return NextResponse.json(merged, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

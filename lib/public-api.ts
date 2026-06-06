/**
 * Helpers for the PUBLIC, read-only agent API under /api/v1.
 *
 * This API is the "connect" layer: it exposes citizen agent state (level,
 * skills, work-history, verifiable proof) so anyone — not just this app — can
 * build on top of FREELON CITY's agents. It is the open-API move that lets a
 * community ship tools/games against the collection (cf. Normies' api.normies.art).
 *
 * Wildcard CORS is SAFE here and ONLY here because every /api/v1 route is a
 * read-only GET over PUBLIC data: citizen progression is public-by-design
 * (keyed by tokenId, survives sale), there are no secrets, no auth, no ledger
 * mutation, and no faucet. The same-origin game/ledger routes stay locked down.
 */

import { NextResponse } from "next/server";

/** Permissive CORS for the public read-only API. Public on-chain/agent data only. */
export function publicCors(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/** Standard 204 preflight for the public API. */
export function publicOptions(): Response {
  return new Response(null, { status: 204, headers: publicCors() });
}

/** JSON response with public CORS + a short shared-cache hint. */
export function publicJson(body: unknown, init?: { status?: number; maxAge?: number }): NextResponse {
  const maxAge = init?.maxAge ?? 60;
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      ...publicCors(),
      "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 5}`,
    },
  });
}

/** Parse a 1..4040 tokenId from a route param, or null if out of range. */
export function parseTokenId(raw: string): number | null {
  const id = parseInt(raw, 10);
  if (!Number.isInteger(id) || id < 1 || id > 4040) return null;
  return id;
}

/**
 * GET /api/collection-metadata/<slug>/<...path> — the polished DYNAMIC tokenURI target
 * for the five sister collections. A contract owner points baseURI here (e.g.
 * `https://www.freeloncity.com/api/collection-metadata/the-crypt-official/`) and the
 * contract appends its token path — `5`, `5.json`, or `metadata/5.json`. The catch-all
 * `path` absorbs every append style; we parse the trailing numeric id (sans `.json`).
 *
 * Response = the FREELON-CITY-grade metadata (original art + full traits, plus a lore
 * description + external_url). Pointing a contract here NEVER changes a token's art.
 *
 * FAIL-SAFE (mirrors /api/metadata/[id]): an unknown slug/token returns a clear,
 * retryable 404/503 — never an empty or partial 200 that could poison a marketplace
 * cache or blank a token.
 */
import { NextResponse } from "next/server";
import { buildTokenMetadata } from "@/lib/collection-metadata";

export const runtime = "nodejs";
// Metadata is derived from static ingested data — cache hard at the edge, but keep it
// revalidatable so a future data refresh propagates.
export const revalidate = 3600;

function parseId(path: string[]): string | null {
  if (!path || path.length === 0) return null;
  // The id is the last segment, with an optional ".json" (or other ext) stripped.
  const last = path[path.length - 1] ?? "";
  const m = last.match(/^(\d+)(?:\.[a-z0-9]+)?$/i);
  return m ? m[1] : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; path: string[] }> },
) {
  const { slug, path } = await params;
  const id = parseId(path);
  if (!id) {
    return NextResponse.json(
      { error: "invalid_token_path" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const meta = buildTokenMetadata(slug, id);
  if (!meta) {
    // Unknown collection or token — fail clearly + retryably, never a broken body.
    return NextResponse.json(
      { error: "metadata_unavailable", slug, id },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(meta, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

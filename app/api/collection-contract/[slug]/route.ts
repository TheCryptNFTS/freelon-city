/**
 * GET /api/collection-contract/<slug> — the COLLECTION-LEVEL metadata target
 * (OpenSea `contractURI()`). Point a contract's `setContractURI` here and a
 * marketplace shows the polished name / lore description / logo / link at the top of
 * the collection. Separate from the per-token route so the per-token catch-all never
 * shadows it. Fail-safe: unknown slug -> 404 (no-store), never a broken 200.
 */
import { NextResponse } from "next/server";
import { buildContractMetadata } from "@/lib/collection-metadata";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = buildContractMetadata(slug);
  if (!meta) {
    return NextResponse.json(
      { error: "collection_unknown", slug },
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

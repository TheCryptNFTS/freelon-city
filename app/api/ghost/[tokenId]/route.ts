/**
 * Ghost lookup — used by <GhostedMask> on every citizen-rendering surface.
 *
 * Returns `{ ghosted: true, since, discount, priceEth, floorEth }` when the
 * token is currently flagged AND past its grace period. Returns
 * `{ ghosted: false }` otherwise.
 *
 * Cheap single-key lookup. Cached at the edge for 60s to spare Upstash.
 */
import { NextResponse } from "next/server";
import { getGhost } from "@/lib/ghost-store";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId: idStr } = await ctx.params;
  const tokenId = Number(idStr);
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) {
    return NextResponse.json({ ghosted: false });
  }
  const g = await getGhost(tokenId);
  if (!g || g.status !== "ghosted") {
    return NextResponse.json({ ghosted: false });
  }
  // Grace window — still flagged but not yet visible-ghosted
  if (Date.now() < g.ghostedAt) {
    return NextResponse.json({
      ghosted: false,
      pending: true,
      flipsAt: g.ghostedAt,
      discount: g.discount,
    });
  }
  return NextResponse.json({
    ghosted: true,
    since: g.ghostedAt,
    discount: g.discount,
    priceEth: g.priceEth,
    floorEth: g.floorEth,
    seller: g.seller,
  });
}

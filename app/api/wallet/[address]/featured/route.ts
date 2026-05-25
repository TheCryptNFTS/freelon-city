/**
 * GET  /api/wallet/{address}/featured            — read featured tokenId (or null)
 * POST /api/wallet/{address}/featured            — set featured tokenId
 *
 * POST is gated by the x-session HMAC cookie — the session's `bind`
 * must match `{address}` (closes the IDOR where one wallet sets another
 * wallet's featured citizen). Caller must ALSO own the picked tokenId,
 * verified server-side via the same getWalletTokens path the rest of
 * the wallet view uses.
 *
 * Founder spec 2026-05-25 (Peterhawk71): "wish I could choose my
 * Citizen on My Own."
 */
import { NextResponse } from "next/server";
import {
  getFeaturedCitizen,
  setFeaturedCitizen,
  clearFeaturedCitizen,
} from "@/lib/featured-citizen-store";
import { getWalletTokens, normalizeAddress } from "@/lib/wallet-tokens";
import { requireSessionBound, isSameOrigin } from "@/lib/x-session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const norm = normalizeAddress(address);
  if (!norm) return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  const tokenId = await getFeaturedCitizen(norm).catch(() => null);
  return NextResponse.json({ address: norm, tokenId });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "cross_origin_blocked" }, { status: 403 });
  }
  const { address } = await params;
  const norm = normalizeAddress(address);
  if (!norm) return NextResponse.json({ error: "invalid_address" }, { status: 400 });

  // x-session must be bound to THIS wallet — IDOR guard
  const sess = requireSessionBound(req, norm);
  if (!sess) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { tokenId?: number | null } = {};
  try { body = await req.json(); } catch {/* allow empty body for DELETE-style */}

  // null/0/undefined → unset
  if (body.tokenId == null || body.tokenId === 0) {
    await clearFeaturedCitizen(norm);
    return NextResponse.json({ ok: true, tokenId: null });
  }

  const tid = Number(body.tokenId);
  if (!Number.isFinite(tid) || tid < 1 || tid > 4040) {
    return NextResponse.json({ error: "invalid_token_id" }, { status: 400 });
  }

  // Ownership check — wallet must actually own this token
  const tokens = await getWalletTokens(norm, 1000).catch(() => null);
  const owned = tokens?.tokenIds ?? [];
  if (!owned.includes(tid)) {
    return NextResponse.json({ error: "not_owner", tokenId: tid }, { status: 403 });
  }

  await setFeaturedCitizen(norm, tid);
  return NextResponse.json({ ok: true, tokenId: tid });
}

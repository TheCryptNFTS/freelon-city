/**
 * POST /api/admin/seed-transform
 * Header: X-Admin-Token: <ADMIN_PREFLIGHT_TOKEN>
 * Body: { tokenId: number, styleKey: string }
 *
 * Founder seed tool — generates ONE real image transform off a citizen's real
 * art (gpt-image-1.5) and records it to the public transforms feed. This is how
 * the "Made in Freelon City" wall gets its first real entries before holders
 * have generated their own. The outputs are GENUINE transforms of real
 * collection art (no fabrication) — they just happen to be founder-run.
 *
 * One image per request (each gpt-image-1.5 edit is ~10-40s; maxDuration 60).
 * Loop client-side to seed N. Runs server-side so the Vercel Blob upload uses
 * the project's OIDC connection (no BLOB_READ_WRITE_TOKEN exists locally).
 *
 * Fail-closed: if SEED_TRANSFORM_SECRET is not set, the endpoint disappears
 * (404). Token check is constant-time. Mirrors app/api/admin/credit. This uses
 * its OWN secret (not the shared ADMIN_PREFLIGHT_TOKEN) so it can be torn down
 * — delete the env var + this file — without touching the other admin tools.
 */
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCitizen } from "@/lib/citizens";
import { empty } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";
import { generateCitizenScene, STYLES, isValidStyle } from "@/lib/missions/image-gen";
import { recordTransform } from "@/lib/transforms-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authed(req: Request): boolean {
  const expected = process.env.SEED_TRANSFORM_SECRET;
  if (!expected) return false;
  const got = req.headers.get("x-seed-token") || "";
  if (got.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!process.env.SEED_TRANSFORM_SECRET) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!authed(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { tokenId?: number; styleKey?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const tokenId = Math.floor(Number(body.tokenId || 0));
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }
  const styleKey = (body.styleKey || "").trim();
  if (!isValidStyle(styleKey)) {
    return NextResponse.json({ error: "invalid_style" }, { status: 400 });
  }
  const citizen = getCitizen(tokenId);
  if (!citizen) {
    return NextResponse.json({ error: "unknown_citizen" }, { status: 404 });
  }

  const spec = deriveSpec(empty(tokenId));
  const gen = await generateCitizenScene({ citizen, spec, styleKey });
  if (!gen.ok) {
    return NextResponse.json({ error: "gen_failed", detail: gen.error }, { status: 502 });
  }

  const styleLabel = STYLES[styleKey].label;
  await recordTransform({ tokenId, url: gen.url, style: styleLabel });

  return NextResponse.json({ ok: true, tokenId, style: styleLabel, url: gen.url });
}

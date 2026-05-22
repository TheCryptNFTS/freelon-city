import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import {
  saveTransmission,
  listTransmissions,
  generateId,
  type Transmission,
} from "@/lib/transmissions-store";
import { isSameOrigin, requireSessionBound } from "@/lib/x-session";
import { isValidAddress, getWalletBalanceVerified } from "@/lib/wallet-tokens";
import { debitWalletHex, getWalletHex } from "@/lib/wallet-hex-store";
import { CIVILIZATIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const SUBMISSION_COST = 100;
const VALID_CIVS = new Set(Object.keys(CIVILIZATIONS));

/**
 * GET /api/transmissions?by=recent|score&civ=<slug>&limit=N&offset=N
 * Public list. Returns only `status: "live"` entries.
 */
export async function GET(req: Request) {
  const rl = await limit(req, "tx:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const url = new URL(req.url);
  const by = url.searchParams.get("by") === "score" ? "score" : "recent";
  const civ = url.searchParams.get("civ");
  const lim = Math.min(parseInt(url.searchParams.get("limit") || "30", 10) || 30, 100);
  const off = parseInt(url.searchParams.get("offset") || "0", 10) || 0;
  const items = await listTransmissions({ by, civ: civ || null, limit: lim, offset: off });
  return NextResponse.json({ items, count: items.length });
}

/**
 * POST /api/transmissions
 * Body: { addr, caption, civ, imageUrl }
 *
 * Auth: X-session bound to wallet. Eligibility: ≥1 citizen held.
 * Burns SUBMISSION_COST hex.
 */
export async function POST(req: Request) {
  const rl = await limit(req, "tx:post", { max: 4, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { addr?: string; caption?: string; civ?: string; imageUrl?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const addr = (body.addr || "").toLowerCase();
  const caption = (body.caption || "").trim();
  const civ = (body.civ || "").toLowerCase();
  const imageUrl = (body.imageUrl || "").trim();

  // Validation
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!VALID_CIVS.has(civ)) {
    return NextResponse.json({ error: "invalid_civ" }, { status: 400 });
  }
  if (caption.length < 1 || caption.length > 280) {
    return NextResponse.json({ error: "invalid_caption", maxChars: 280 }, { status: 400 });
  }
  // Strip control chars + HTML metachars from caption
  // eslint-disable-next-line no-control-regex
  const cleanCaption = caption.replace(/[\x00-\x1f\x7f]/g, "");

  // Validate image URL — must be https + look like a real image host
  if (!/^https:\/\//i.test(imageUrl)) {
    return NextResponse.json({ error: "image_url_must_be_https" }, { status: 400 });
  }
  if (imageUrl.length > 500) {
    return NextResponse.json({ error: "image_url_too_long" }, { status: 400 });
  }
  // Defense: reject obvious script / data URIs and host-only
  if (/^(javascript:|data:|vbscript:|file:)/i.test(imageUrl) || !/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(imageUrl)) {
    return NextResponse.json({ error: "image_url_not_recognized" }, { status: 400 });
  }

  // Auth
  const session = requireSessionBound(req, addr);
  if (!session) {
    return NextResponse.json({ error: "session_required" }, { status: 401 });
  }

  // Eligibility: must be a holder
  const balance = await getWalletBalanceVerified(addr);
  if (balance === null) {
    return NextResponse.json({ error: "balance_unknown_retry" }, { status: 503 });
  }
  if (balance < 1) {
    return NextResponse.json({ error: "not_a_carrier", balance: 0 }, { status: 403 });
  }

  // Hex balance check
  const rec = await getWalletHex(addr);
  if (rec.balance < SUBMISSION_COST) {
    return NextResponse.json(
      { error: "insufficient_hex", required: SUBMISSION_COST, balance: rec.balance },
      { status: 402 },
    );
  }

  // Debit BEFORE save (rollback save if debit fails is harder than rollback debit)
  try {
    await debitWalletHex(addr, SUBMISSION_COST, {
      kind: "manual",
      note: `Transmission · ${cleanCaption.slice(0, 40)}…`,
    });
  } catch {
    return NextResponse.json({ error: "debit_failed" }, { status: 402 });
  }

  const t: Transmission = {
    id: generateId(),
    author: addr,
    authorHandle: (session.xHandle || "").toLowerCase().replace(/^@/, ""),
    civ,
    caption: cleanCaption,
    imageUrl,
    createdAt: Date.now(),
    signals: 0,
    boostHex: 0,
    reports: 0,
    status: "live",
  };
  await saveTransmission(t);

  return NextResponse.json({ ok: true, id: t.id, burned: SUBMISSION_COST });
}

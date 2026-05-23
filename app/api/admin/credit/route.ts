/**
 * POST /api/admin/credit
 * Header: X-Admin-Token: <ADMIN_PREFLIGHT_TOKEN>
 * Body: { wallet: "0x…", amount: number, note?: string }
 *
 * One-off manual hex credit. Use this for goodwill credits to users
 * who hit bugs (e.g. @Lady Magic 2026-05-24 — bridge bug ate her
 * post + sweep credits).
 *
 * Fail-closed: if ADMIN_PREFLIGHT_TOKEN is not set, the endpoint
 * disappears (404). Token check is constant-time.
 *
 * Caps: amount must be 1..10000 — sanity cap so a fat-finger doesn't
 * mint someone a million hex. For larger one-offs, run it twice.
 */
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { creditWalletHex, getWalletHex } from "@/lib/wallet-hex-store";

export const dynamic = "force-dynamic";

const MAX_AMOUNT = 10_000;

function authed(req: Request): boolean {
  const expected = process.env.ADMIN_PREFLIGHT_TOKEN;
  if (!expected) return false;
  const got = req.headers.get("x-admin-token") || "";
  if (got.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!process.env.ADMIN_PREFLIGHT_TOKEN) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!authed(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { wallet?: string; amount?: number; note?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const wallet = (body.wallet || "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "invalid_wallet" }, { status: 400 });
  }
  const amount = Math.floor(Number(body.amount || 0));
  if (!Number.isFinite(amount) || amount < 1 || amount > MAX_AMOUNT) {
    return NextResponse.json({ error: "invalid_amount", min: 1, max: MAX_AMOUNT }, { status: 400 });
  }
  const note = (body.note || "Admin manual credit").slice(0, 120);

  try {
    await creditWalletHex(wallet, amount, {
      kind: "manual",
      note,
    });
    const rec = await getWalletHex(wallet);
    return NextResponse.json({
      ok: true,
      wallet,
      credited: amount,
      newBalance: rec.balance,
      lifetimeEarned: rec.lifetimeEarned,
    });
  } catch (e) {
    return NextResponse.json({
      error: "credit_failed",
      detail: e instanceof Error ? e.message.slice(0, 120) : "unknown",
    }, { status: 500 });
  }
}

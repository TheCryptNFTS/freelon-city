import { NextResponse } from "next/server";
import { addTithe, isValidTitheAmount, MIN_TITHE_AMOUNT } from "@/lib/tithe-store";
import { debitWalletHex, getWalletHex } from "@/lib/wallet-hex-store";
import { CIVILIZATIONS } from "@/lib/constants";
import { isValidAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { requireXSession } from "@/lib/require-x";

export const dynamic = "force-dynamic";

const VALID_CIVS = new Set(Object.keys(CIVILIZATIONS));

// POST { address, civ, amount, display }
// Burns `amount` hex from wallet, records on civ patron wall for 7 days.
export async function POST(req: Request) {
  const rl = await limit(req, "tithe:post", { max: 10, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  // CSRF: same-origin only
  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { address?: string; civ?: string; amount?: number; display?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const address = (body.address || "").toLowerCase();
  const civ = (body.civ || "").toLowerCase();
  const amount = Math.floor(Number(body.amount || 0));
  const display = (body.display || "").trim().slice(0, 32) || `0x${address.slice(2, 6)}…${address.slice(-4)}`;

  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!VALID_CIVS.has(civ)) {
    return NextResponse.json({ error: "invalid_civ" }, { status: 400 });
  }
  if (!isValidTitheAmount(amount)) {
    return NextResponse.json(
      { error: `min_tithe_${MIN_TITHE_AMOUNT}` },
      { status: 400 },
    );
  }

  // Require verified X session AND session must be bound to the burning wallet.
  // Without this check, any signed-in user could drain any wallet's hex by
  // passing the target address in body — the X session alone isn't enough.
  const session = await requireXSession(req, {});
  if (session instanceof NextResponse) return session;
  const sessionBind = (session.bind || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(sessionBind) || sessionBind !== address) {
    return NextResponse.json(
      { error: "wallet_not_bound_to_session", hint: "Sign in with X using the wallet you want to burn from." },
      { status: 403 },
    );
  }

  // Sanitize display name — multiple layers:
  //   1. Strip control chars (incl. zero-width joiners that smuggle hidden text)
  //   2. Strip HTML metachars + quotes
  //   3. Normalize unicode to NFC so combining marks don't render as
  //      visually identical look-alikes to brand names
  //   4. Reject if the result is empty after cleaning (was just punctuation)
  const safeDisplay = display
    .normalize("NFC")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f<>&"'`\\/]/g, "")
    // Strip zero-width and bidi-control runs (homoglyph attack vector)
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .slice(0, 32)
    .trim();
  if (!safeDisplay) {
    return NextResponse.json({ error: "invalid_display" }, { status: 400 });
  }

  // Collapse-mode sink discount — when the city is dimming, burns are
  // honored at a fraction of the asked amount. Carriers can either pay
  // the discounted price (and have the wall record the post-discount
  // burn) OR overpay; we accept the body amount as a ceiling.
  const { getCollapseState, applySinkMultiplier } = await import("@/lib/collapse-mode");
  const collapse = await getCollapseState();
  const effectiveBurn = collapse.active ? applySinkMultiplier(amount, collapse) : amount;

  // Check balance against the effective (post-discount) burn
  const hex = await getWalletHex(address);
  if (hex.balance < effectiveBurn) {
    return NextResponse.json(
      { error: "insufficient_hex", balance: hex.balance, needed: effectiveBurn },
      { status: 402 },
    );
  }

  // Burn + record
  try {
    await debitWalletHex(address, effectiveBurn, {
      kind: "manual",
      note: `Tithe to ${civ} (+${safeDisplay})${collapse.active ? ` · COLLAPSE -${Math.round((1 - collapse.sinkMultiplier) * 100)}%` : ""}`,
    });
  } catch {
    return NextResponse.json({ error: "burn_failed" }, { status: 500 });
  }

  const rec = await addTithe({
    civ,
    payerKey: address,
    display: safeDisplay,
    amount: effectiveBurn,
  });

  return NextResponse.json({
    ok: true,
    tithe: rec,
    collapseDiscountApplied: collapse.active,
    originalAmount: amount,
    burned: effectiveBurn,
  });
}

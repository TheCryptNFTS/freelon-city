import { NextResponse } from "next/server";
import { debitWalletHex, getWalletHex } from "@/lib/wallet-hex-store";
import { isValidAddress, getWalletTokens } from "@/lib/wallet-tokens";
import { getCitizen } from "@/lib/citizens";
import { CIVILIZATIONS } from "@/lib/constants";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { requireXSession } from "@/lib/require-x";
import { RECKONING_MIN_TRIBUTE, musterMultiplier } from "@/lib/reckoning-config";
import { recordTribute } from "@/lib/reckoning-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CIVS = new Set(Object.keys(CIVILIZATIONS));

/**
 * POST /api/reckoning/tribute  { address, civ, amount }
 *
 * Burn `amount` hex toward `civ` in the live week's tribute war. The hex DEBIT
 * is a SINK on the audited economy — it only ever burns, never mints. Auth
 * mirrors /api/tithe exactly: same-origin + an X session BOUND to the burning
 * wallet (the X session alone is not enough — without the bind check any
 * signed-in user could drain any wallet by passing its address in the body).
 *
 * Muster: held citizens of the tributed civ amplify the WAR SCORE only
 * (the token is the game piece). The hex burned is always the raw amount the
 * player chose, so the amplifier can never be an economic exploit.
 */
export async function POST(req: Request) {
  const rl = await limit(req, "reckoning:tribute", { max: 10, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  // CSRF: same-origin only.
  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { address?: string; civ?: string; amount?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const address = (body.address || "").toLowerCase();
  const civ = (body.civ || "").toLowerCase();
  const amount = Math.floor(Number(body.amount || 0));

  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!VALID_CIVS.has(civ)) {
    return NextResponse.json({ error: "invalid_civ" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < RECKONING_MIN_TRIBUTE) {
    return NextResponse.json(
      { error: `min_tribute_${RECKONING_MIN_TRIBUTE}` },
      { status: 400 },
    );
  }

  // Require a verified X session bound to the burning wallet (IDOR guard).
  const session = await requireXSession(req, {});
  if (session instanceof NextResponse) return session;
  const sessionBind = (session.bind || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(sessionBind) || sessionBind !== address) {
    return NextResponse.json(
      {
        error: "wallet_not_bound_to_session",
        hint: "Sign in with X using the wallet you want to burn from.",
      },
      { status: 403 },
    );
  }

  // Collapse-mode sink discount — keep both sinks identical so there's no
  // arbitrage between tithe and tribute while the city is dimming.
  const { getCollapseState, applySinkMultiplier } = await import("@/lib/collapse-mode");
  const collapse = await getCollapseState();
  const effectiveBurn = collapse.active ? applySinkMultiplier(amount, collapse) : amount;

  // Balance check against the effective (post-discount) burn.
  const hex = await getWalletHex(address);
  if (hex.balance < effectiveBurn) {
    return NextResponse.json(
      { error: "insufficient_hex", balance: hex.balance, needed: effectiveBurn },
      { status: 402 },
    );
  }

  // Muster: verify on-chain ownership to count held citizens of this civ.
  // Fail-safe — a failed lookup yields 0 held → 1x, never an over-credit.
  let heldOfCiv = 0;
  try {
    const tokens = await getWalletTokens(address, 500);
    if (tokens) {
      for (const id of tokens.tokenIds) {
        if (getCitizen(id)?.civilization === civ) heldOfCiv += 1;
      }
    }
  } catch {
    /* treat as non-holder → 1x muster */
  }
  // Burn (the sink), then record into the isolated war tally.
  try {
    await debitWalletHex(address, effectiveBurn, {
      kind: "manual",
      note: `Reckoning tribute to ${civ}${collapse.active ? ` · COLLAPSE -${Math.round((1 - collapse.sinkMultiplier) * 100)}%` : ""}`,
    });
  } catch {
    return NextResponse.json({ error: "burn_failed" }, { status: 500 });
  }

  // War points are computed inside recordTribute via the anti-whale curve,
  // keyed on this wallet's cumulative raw hex to the civ this week.
  const { week, civ: civWar, general, points } = await recordTribute({
    address,
    civ,
    rawHex: effectiveBurn,
    heldOfCiv,
  });

  return NextResponse.json({
    ok: true,
    week,
    burned: effectiveBurn,
    originalAmount: amount,
    collapseDiscountApplied: collapse.active,
    heldOfCiv,
    muster: musterMultiplier(heldOfCiv),
    points,
    civ: { slug: civWar.slug, score: civWar.score, rawHex: civWar.rawHex, tributes: civWar.tributes },
    general: { score: general.score, rawHex: general.rawHex },
  });
}

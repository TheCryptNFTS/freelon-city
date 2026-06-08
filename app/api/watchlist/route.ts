import { NextResponse } from "next/server";
import { isValidAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import {
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  WATCHLIST_COST,
} from "@/lib/watchlist-store";
import { debitWalletHex, getWalletHex } from "@/lib/wallet-hex-store";

const MAX_WATCHLIST_PER_WALLET = 50;

export const dynamic = "force-dynamic";

/** GET /api/watchlist?addr=0x... → list of tokenIds watched */
export async function GET(req: Request) {
  const rl = await limit(req, "watch:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const url = new URL(req.url);
  const addr = url.searchParams.get("addr") || "";
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  const tokens = await getWatchlist(addr);
  const rec = await getWalletHex(addr);
  return NextResponse.json({
    tokens,
    cost: WATCHLIST_COST,
    balance: rec.balance,
  });
}

/**
 * POST /api/watchlist
 * Body: { addr, tokenId, action: "add" | "remove" }
 * "add" debits WATCHLIST_COST. "remove" is free.
 */
export async function POST(req: Request) {
  const rl = await limit(req, "watch:post", { max: 10, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  // CSRF: only accept same-origin browser POSTs
  const { isSameOrigin, requireSessionBound, requireProvenWallet } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { addr?: string; tokenId?: number; action?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const addr = (body.addr || "").toLowerCase();
  const tokenId = Number(body.tokenId);
  const action = body.action;

  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }
  if (action !== "add" && action !== "remove") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  // Auth gate. "remove" is FREE and identity-only, so a session bound to the
  // wallet is sufficient. "add" SPENDS ⬡ (WATCHLIST_COST), so the spending
  // wallet must be CRYPTOGRAPHICALLY PROVEN (walletProof) — the forgeable
  // `bind` can never authorize a debit or an attacker would drain a victim's
  // hex 50⬡ at a time by spamming { addr: <victim> } adds.
  if (action === "remove") {
    if (!requireSessionBound(req, addr)) {
      return NextResponse.json({ error: "session_required" }, { status: 401 });
    }
    await removeFromWatchlist(addr, tokenId);
    return NextResponse.json({ ok: true, action: "remove" });
  }

  if (!requireProvenWallet(req, addr)) {
    return NextResponse.json(
      { error: "wallet_proof_required", message: "Sign with your wallet once to spend ⬡." },
      { status: 401 },
    );
  }

  // Per-wallet size cap — stops a single wallet from watchlisting the
  // entire collection to grief the public red-signal feed.
  const current = await getWatchlist(addr);
  if (current.includes(tokenId)) {
    return NextResponse.json({ error: "already_watching" }, { status: 409 });
  }
  if (current.length >= MAX_WATCHLIST_PER_WALLET) {
    return NextResponse.json(
      { error: "watchlist_full", max: MAX_WATCHLIST_PER_WALLET },
      { status: 409 },
    );
  }

  // Debit hex before add — fail closed
  const rec = await getWalletHex(addr);
  if (rec.balance < WATCHLIST_COST) {
    return NextResponse.json(
      { error: "insufficient_hex", required: WATCHLIST_COST, balance: rec.balance },
      { status: 402 },
    );
  }
  // Add FIRST, then debit. If the add fails (Redis hiccup), hex isn't burned.
  // If the add succeeds and the debit fails, we have a free watch — that's
  // the lesser evil; we surface debit_failed and the user can claim it later.
  try {
    await addToWatchlist(addr, tokenId);
  } catch {
    return NextResponse.json({ error: "add_failed" }, { status: 500 });
  }
  try {
    await debitWalletHex(addr, WATCHLIST_COST, {
      kind: "manual",
      note: `Watchlist · added #${String(tokenId).padStart(4, "0")}`,
    });
  } catch {
    // Rollback the add to keep state consistent
    try { await removeFromWatchlist(addr, tokenId); } catch {}
    return NextResponse.json({ error: "debit_failed" }, { status: 402 });
  }

  return NextResponse.json({
    ok: true,
    action: "add",
    burned: WATCHLIST_COST,
  });
}

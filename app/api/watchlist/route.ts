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

  if (action === "remove") {
    await removeFromWatchlist(addr, tokenId);
    return NextResponse.json({ ok: true, action: "remove" });
  }

  // Debit hex before add — fail closed
  const rec = await getWalletHex(addr);
  if (rec.balance < WATCHLIST_COST) {
    return NextResponse.json(
      { error: "insufficient_hex", required: WATCHLIST_COST, balance: rec.balance },
      { status: 402 },
    );
  }
  try {
    await debitWalletHex(addr, WATCHLIST_COST, {
      kind: "manual",
      note: `Watchlist · added #${String(tokenId).padStart(4, "0")}`,
    });
  } catch {
    return NextResponse.json({ error: "debit_failed" }, { status: 402 });
  }
  await addToWatchlist(addr, tokenId);

  return NextResponse.json({
    ok: true,
    action: "add",
    burned: WATCHLIST_COST,
  });
}

import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { verifyBearer } from "@/lib/game-session";
import {
  isArcadeGame,
  makeIdentity,
  submitScore,
  topScores,
  validHandle,
  MAX_SCORE,
} from "@/lib/arcade-score-store";

export const dynamic = "force-dynamic";

/** GET /api/arcade/score?game=hex-match&limit=20 — top runs, highest first. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const game = url.searchParams.get("game") || "";
  if (!isArcadeGame(game)) {
    return NextResponse.json({ error: "unknown_game" }, { status: 400 });
  }
  const n = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const top = await topScores(game, n);
  return NextResponse.json({ game, top });
}

/**
 * POST /api/arcade/score  { game, score, handle?, wallet? }
 * Stamps a run under a typed handle or connected wallet. Keeps the player's
 * best (server-side max). Scores are client-reported, so we cap + rate-limit.
 *
 * SECURITY: a wallet-attributed score is identity, not just decoration —
 * stamping a top run under someone else's wallet is impersonation. So `body.wallet`
 * is NEVER trusted: any wallet attribution REQUIRES a valid SIWE bearer, and the
 * stored wallet is forced to the authenticated SESSION address. Anonymous,
 * handle-only scores stay open so casual top-of-funnel play still works.
 */
export async function POST(req: Request) {
  const state = await limit(req, "arcade-score", { max: 20, windowSec: 60 });
  if (!state.ok) return tooManyResponse(state);

  let body: { game?: string; score?: number; handle?: string; wallet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const game = body.game || "";
  if (!isArcadeGame(game)) {
    return NextResponse.json({ error: "unknown_game" }, { status: 400 });
  }

  const score = body.score;
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return NextResponse.json({ error: "bad_score" }, { status: 400 });
  }

  if (body.handle != null && body.handle !== "" && !validHandle(body.handle)) {
    return NextResponse.json({ error: "bad_handle" }, { status: 400 });
  }

  // Wallet attribution is impersonation-sensitive: require a valid bearer and
  // bind the stored wallet to the SESSION address, never to client-supplied
  // `body.wallet`. Anonymous (handle-only) scores skip auth entirely.
  let walletForIdentity: string | undefined;
  const claimedWallet = body.wallet?.trim();
  if (claimedWallet) {
    const session = await verifyBearer(req);
    if (!session) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    if (session.address.toLowerCase() !== claimedWallet.toLowerCase()) {
      return NextResponse.json({ error: "wallet_mismatch" }, { status: 403 });
    }
    walletForIdentity = session.address;
  }

  const identity = makeIdentity({ wallet: walletForIdentity, handle: body.handle });
  if (!identity) {
    return NextResponse.json({ error: "need_identity" }, { status: 400 });
  }

  const { best, rank } = await submitScore(game, identity.id, identity.handle, score);
  const top = await topScores(game, 20);
  return NextResponse.json({ game, handle: identity.handle, best, rank, top });
}

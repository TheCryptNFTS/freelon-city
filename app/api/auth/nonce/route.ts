import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { isValidAddress } from "@/lib/wallet-tokens";
import { issueNonce } from "@/lib/auth-nonce-store";
import { gameCorsHeaders, gameOptions } from "@/lib/game-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/nonce  body { address } -> 200 { nonce }
 *
 * Step 1 of SIWE bearer auth: issue a single-use, 5-minute nonce for the
 * address. The client signs a server-rebuilt message containing this nonce; the
 * verify step rebuilds the same message and checks the signature.
 *
 * Cross-origin (game SPA) — CORS allow-list, never `*`.
 */

export async function OPTIONS(req: Request) {
  return gameOptions(req);
}

export async function POST(req: Request) {
  const cors = gameCorsHeaders(req);
  const rl = await limit(req, "auth-nonce", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  let body: { address?: string };
  try {
    body = (await req.json()) as { address?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: cors });
  }

  const address = (body.address || "").trim();
  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400, headers: cors });
  }

  const nonce = await issueNonce(address);
  return NextResponse.json({ nonce }, { headers: cors });
}

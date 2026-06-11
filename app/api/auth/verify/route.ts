import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { isValidAddress } from "@/lib/wallet-tokens";
import { consumeNonce } from "@/lib/auth-nonce-store";
import { mintSession, buildAuthMessage, nonceIssuedAt } from "@/lib/game-session";
import { gameCorsHeaders, gameOptions } from "@/lib/game-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify  body { address, signature }
 *   -> 200 { token, address, expiresAt } | 401
 *
 * Step 2 of SIWE bearer auth:
 *   1. Load + consume (single-use delete) the stored nonce for `address`.
 *      Missing/expired -> 401.
 *   2. REBUILD the signed message SERVER-SIDE from the stored nonce — we never
 *      trust a client-supplied message string, so a client cannot smuggle a
 *      different statement past the signature check.
 *   3. `verifyMessage({ address, message, signature })` in the same try/catch
 *      shape as the realign route. Failure -> 401.
 *   4. On success mint a bearer session (HMAC + revocable Upstash record).
 *
 * Cross-origin (game SPA) — CORS allow-list, never `*`.
 */

export async function OPTIONS(req: Request) {
  return gameOptions(req);
}

export async function POST(req: Request) {
  const cors = gameCorsHeaders(req);
  const rl = await limit(req, "auth-verify", { max: 20, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl, cors);

  let body: { address?: string; signature?: string };
  try {
    body = (await req.json()) as { address?: string; signature?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: cors });
  }

  const address = (body.address || "").trim();
  const signature = body.signature;
  if (!isValidAddress(address) || !signature || typeof signature !== "string") {
    return NextResponse.json({ error: "address + signature required" }, { status: 400, headers: cors });
  }

  // Single-use nonce: consume deletes it so the same signature can't be replayed.
  const nonce = await consumeNonce(address);
  if (!nonce) {
    return NextResponse.json({ error: "nonce_missing_or_expired" }, { status: 401, headers: cors });
  }

  // Rebuild the EXACT message the client signed, SERVER-SIDE, from the stored
  // nonce. issuedAt is derived deterministically from the nonce (see
  // nonceIssuedAt) so both sides agree without round-tripping a timestamp, and
  // the client message string is never trusted.
  const message = buildAuthMessage(address, nonce, nonceIssuedAt(nonce));

  let sigOk = false;
  try {
    sigOk = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    sigOk = false;
  }
  if (!sigOk) {
    return NextResponse.json({ error: "signature verification failed" }, { status: 401, headers: cors });
  }

  const session = await mintSession(address);
  return NextResponse.json(session, { headers: cors });
}

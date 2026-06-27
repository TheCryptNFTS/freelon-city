import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/x-session";
import { issueNonce } from "@/lib/auth-nonce-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/x/prove/nonce  { address } -> { nonce }
 *
 * Step 1 of the wallet-proof challenge. Issues a single-use, 5-minute nonce
 * (scope "xprove", namespaced so it never collides with the SIWE game-login
 * nonce) that the client embeds in walletProofMessage. /api/x/prove consumes it
 * on verify, so a captured signature can't be replayed to re-prove the wallet.
 *
 * Same-origin only — this is the city's own client, not the cross-origin game
 * SPA, so we reuse the prove route's isSameOrigin guard rather than CORS.
 */
export async function POST(req: Request) {
  const rl = await limit(req, "x:prove-nonce", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { address?: string };
  const address = (body.address || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const nonce = await issueNonce(address, "xprove");
  return NextResponse.json({ nonce });
}

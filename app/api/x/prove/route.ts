import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import {
  getSessionFromRequest,
  signSession,
  walletProofMessage,
  X_SESSION_COOKIE,
  sessionCookieOptions,
  isSameOrigin,
} from "@/lib/x-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/x/prove  { address, signature }
 *
 * Proves the caller controls `address` by verifying a personal_sign over the
 * canonical walletProofMessage, then RE-ISSUES the session cookie with
 * `walletProof` set. This is the ONLY way a session gains wallet authority —
 * the OAuth `bind` param is attacker-chooseable and must never be trusted to
 * move ⬡ (see security note in lib/x-session.ts).
 *
 * A signature here unlocks all spend rails for the 7-day session life, so a
 * holder signs at most once. An X session is NOT required: a wallet-only
 * proven session is valid (xId/xHandle stay blank), so wallet-first holders can
 * spend without an X account.
 */
export async function POST(req: Request) {
  const rl = await limit(req, "x:prove", { max: 20, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    address?: string;
    signature?: string;
  };
  const address = (body.address || "").toLowerCase();
  const signature = body.signature || "";
  if (!/^0x[a-f0-9]{40}$/.test(address) || !signature) {
    return NextResponse.json({ error: "address + signature required" }, { status: 400 });
  }

  let sigOk = false;
  try {
    sigOk = await verifyMessage({
      address: address as `0x${string}`,
      message: walletProofMessage(address),
      signature: signature as `0x${string}`,
    });
  } catch {
    sigOk = false;
  }
  if (!sigOk) {
    return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
  }

  // Preserve any existing X identity; if there's no session, this becomes a
  // wallet-only proven session (bind defaults to the proven wallet).
  const existing = getSessionFromRequest(req);
  const token = signSession({
    xId: existing?.xId ?? "",
    xHandle: existing?.xHandle ?? "",
    bind: existing?.bind ?? address,
    walletProof: address,
  });

  const res = NextResponse.json({ ok: true, wallet: address });
  res.cookies.set(X_SESSION_COOKIE, token, sessionCookieOptions(req));
  return res;
}

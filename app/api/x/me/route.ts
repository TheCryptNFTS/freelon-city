import { NextResponse } from "next/server";
import { getXVerification, getByHandle, type XVerification } from "@/lib/x-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getSessionFromRequest } from "@/lib/x-session";

export const dynamic = "force-dynamic";

/**
 * GET /api/x/me?handle=<xHandle>
 *   Third-party lookup — "is this handle verified by a holder?" (tribute
 *   badges). Store-only; returns someone else's record.
 *
 * GET /api/x/me  (or ?bind=<wallet>)
 *   "Is THIS browser signed in to X?" — display/identity probe.
 *
 * 2026-05-30 Bug A fix — "can't have X and wallet connected at the same time".
 * Both cookies always physically coexist (wallet connect never touches the
 * x_session cookie). The bug was that this endpoint resolved X-verification
 * by the CURRENT wallet (`?bind=<addr>`), while the session's `bind` was
 * frozen to whatever wallet existed at sign-in. Connect a different wallet
 * (or verify X with no wallet, then connect one) and the lookup missed → the
 * UI showed the user as logged out of X.
 *   Fix: for the browser's own probe, the HMAC session cookie is the source
 * of truth and is INDEPENDENT of which wallet is connected now. Claim-gating
 * still enforces the wallet↔session bind separately in the mutation routes
 * (requireSessionBound), so this display probe can safely ignore the wallet.
 */
export async function GET(req: Request) {
  const rl = await limit(req, "x:me", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const url = new URL(req.url);
  const bind = url.searchParams.get("bind");
  const handle = url.searchParams.get("handle");

  // Third-party badge lookup stays store-keyed by handle.
  if (handle) {
    return NextResponse.json({ verification: await getByHandle(handle) });
  }

  // The current browser's own X session is authoritative for "am I verified",
  // regardless of the connected wallet.
  const s = getSessionFromRequest(req);
  if (s) {
    const boundWallet = (s.bind || "").toLowerCase();
    const v: XVerification = { xId: s.xId, xHandle: s.xHandle, verifiedAt: 0, bind: boundWallet };
    return NextResponse.json({ verification: v, boundWallet });
  }

  // No session cookie — fall back to the store by bind (older browsers, or
  // resolving another key's record).
  if (bind) {
    return NextResponse.json({ verification: await getXVerification(bind) });
  }

  return NextResponse.json({ error: "missing_param" }, { status: 400 });
}

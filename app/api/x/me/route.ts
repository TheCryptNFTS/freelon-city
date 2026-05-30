import { NextResponse } from "next/server";
import { getXVerification, getByHandle, type XVerification } from "@/lib/x-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getSessionFromRequest } from "@/lib/x-session";

export const dynamic = "force-dynamic";

/**
 * GET /api/x/me?bind=<wallet|handle>
 * Returns the X verification record for a given bind key, or null.
 *
 * GET /api/x/me?handle=<xHandle>
 * Returns the verification record by X handle (for tribute pages to show a
 * "verified by holder" badge).
 */
export async function GET(req: Request) {
  const rl = await limit(req, "x:me", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const url = new URL(req.url);
  const bind = url.searchParams.get("bind");
  const handle = url.searchParams.get("handle");
  if (!bind && !handle) {
    return NextResponse.json({ error: "missing_param" }, { status: 400 });
  }
  let v = bind ? await getXVerification(bind) : await getByHandle(handle!);

  // 2026-05-29 persistence fix — the verified badge / "stay connected" state
  // used to depend ENTIRELY on the Upstash store. If the store entry is
  // missing (Upstash env not set in prod → per-lambda in-memory map that
  // doesn't survive across serverless instances, or an evicted record), a
  // user with a perfectly valid 7-day session cookie reads as unverified and
  // gets bounced back to sign in. The HMAC session cookie is self-contained
  // and tamper-proof, so trust it as a fallback source of truth: if the store
  // has nothing but the request carries a valid session bound to this key,
  // synthesize the verification from the session.
  if (!v && bind) {
    const s = getSessionFromRequest(req);
    if (s && (s.bind || "").toLowerCase() === bind.toLowerCase()) {
      v = { xId: s.xId, xHandle: s.xHandle, verifiedAt: 0, bind: bind.toLowerCase() } satisfies XVerification;
    }
  }

  return NextResponse.json({ verification: v });
}

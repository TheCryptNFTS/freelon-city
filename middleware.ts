import { NextResponse, type NextRequest } from "next/server";

/**
 * Referral capture.
 *
 * Invite links are `freeloncity.com/sync?r=<handle>` (see components/MyInvites).
 * The X OAuth callback reads a `freelon_ref` cookie to attribute the joiner to
 * their referrer. That cookie used to be written in /sync's Server Component
 * render via cookies().set() — but Next 15 only permits cookie mutation in a
 * Server Action / Route Handler / middleware; during page render it throws and
 * the surrounding try/catch swallowed it, so referral attribution silently
 * never persisted.
 *
 * Middleware is the correct place: it can legitimately attach Set-Cookie to the
 * response. Runs only on /sync (matcher below), so it adds no latency elsewhere.
 *
 * Edge runtime — everything here is inlined (no node:crypto, no citizens data).
 */

const COOKIE = "freelon_ref";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Mirror of lib/sync.normalizeHandle — inlined to keep middleware edge-light.
function normalizeHandle(input: string): string {
  return (input || "")
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 32);
}

// Mirror of lib/x-session.authCookieDomainForHost — scope to the registrable
// domain on prod so a referral set on apex survives the OAuth hop to www.
function cookieDomain(host: string | null): string | undefined {
  const h = (host || "").split(":")[0].toLowerCase();
  if (h === "freeloncity.com" || h.endsWith(".freeloncity.com")) {
    return ".freeloncity.com";
  }
  return undefined;
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const raw = req.nextUrl.searchParams.get("r");
  if (raw) {
    const ref = normalizeHandle(raw);
    if (ref) {
      const domain = cookieDomain(req.headers.get("host"));
      res.cookies.set(COOKIE, ref, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: MAX_AGE,
        ...(domain ? { domain } : {}),
      });
    }
  }
  return res;
}

export const config = {
  matcher: ["/sync"],
};

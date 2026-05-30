import crypto from "node:crypto";

/**
 * Stateless HMAC-signed session cookie that binds a browser session to a
 * verified X handle. Used to gate mutating endpoints (shop, carrier, unlock)
 * so the caller must have completed the OAuth flow recently.
 *
 * Format: <base64url(payload)>.<base64url(hmacSha256(payload, secret))>
 * Payload JSON: { xId, xHandle, bind, exp }
 *
 * Secret derives from X_OAUTH_CLIENT_SECRET (always present when OAuth works)
 * with a domain-separating tag so it cannot be substituted with another HMAC.
 */

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_NAME = "x_session";

export type XSession = {
  xId: string;
  xHandle: string;
  bind: string;
  exp: number;
};

function secret(): Buffer {
  const s = process.env.X_OAUTH_CLIENT_SECRET;
  if (!s) throw new Error("x session: X_OAUTH_CLIENT_SECRET not configured");
  return crypto.createHash("sha256").update(`freelon:x-session:v1:${s}`).digest();
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signSession(input: Omit<XSession, "exp"> & { ttlMs?: number }): string {
  const exp = Date.now() + (input.ttlMs ?? SESSION_TTL_MS);
  const payload: XSession = {
    xId: input.xId,
    xHandle: input.xHandle,
    bind: input.bind,
    exp,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB = Buffer.from(payloadStr, "utf8");
  const mac = crypto.createHmac("sha256", secret()).update(payloadB).digest();
  return `${b64url(payloadB)}.${b64url(mac)}`;
}

export function verifySession(token: string | undefined | null): XSession | null {
  if (!token || typeof token !== "string") return null;
  const [p, m] = token.split(".");
  if (!p || !m) return null;
  let payloadB: Buffer;
  let macB: Buffer;
  try {
    payloadB = b64urlDecode(p);
    macB = b64urlDecode(m);
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", secret()).update(payloadB).digest();
  if (expected.length !== macB.length) return null;
  if (!crypto.timingSafeEqual(expected, macB)) return null;
  let payload: XSession;
  try {
    payload = JSON.parse(payloadB.toString("utf8")) as XSession;
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) {
    return null;
  }
  return payload;
}

export const X_SESSION_COOKIE = COOKIE_NAME;

/**
 * Read the HMAC X-session from a Request's cookie header. Returns the
 * verified payload or null. Use this when a route needs to prove the
 * caller has a valid session.
 */
export function getSessionFromRequest(req: Request): XSession | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  if (!m) return null;
  return verifySession(decodeURIComponent(m[1]));
}

/**
 * Stronger gate: the caller must have a valid session AND its bind
 * (the wallet/handle they verified) must match `expected`. Returns
 * the session on success, null otherwise. Closes the IDOR vector where
 * an attacker passes another wallet's address in the body.
 */
export function requireSessionBound(req: Request, expected: string): XSession | null {
  const s = getSessionFromRequest(req);
  if (!s) return null;
  if ((s.bind || "").toLowerCase() !== expected.toLowerCase()) return null;
  return s;
}

/**
 * CSRF defence: rejects cross-origin POSTs by comparing the Origin /
 * Referer header against the request's own Host. `SameSite=Lax` blocks
 * top-level navigations but NOT `fetch(..., {credentials: 'include'})`
 * from another origin — this header check is the second line of defence.
 *
 * Returns true if the request is same-origin (or has no Origin/Referer
 * at all, which would be a non-browser caller like curl — those are
 * already blocked by needing a valid signed session above).
 */
export function isSameOrigin(req: Request): boolean {
  const host = req.headers.get("host");
  if (!host) return false;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      return url.host === host;
    } catch {
      return false;
    }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return url.host === host;
    } catch {
      return false;
    }
  }
  // No Origin / Referer headers → non-browser (curl, server-to-server).
  // We accept these here because the session/signature checks above are
  // the actual authentication; the browser CSRF surface is what this guards.
  return true;
}

/**
 * 2026-05-30 — the site serves on both freeloncity.com (apex) and
 * www.freeloncity.com. Auth cookies were host-only, so a session set on one
 * host wasn't sent on the other → users appeared logged out / OAuth looped.
 * Scope auth cookies to the registrable domain so they span apex + www.
 * Returns undefined off-prod (localhost, *.vercel.app) so those keep working
 * with plain host-only cookies. Pass the request's Host header.
 */
export function authCookieDomain(req: Request): string | undefined {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (host === "freeloncity.com" || host.endsWith(".freeloncity.com")) {
    return ".freeloncity.com";
  }
  return undefined;
}

export function sessionCookieOptions(req?: Request) {
  const domain = req ? authCookieDomain(req) : undefined;
  return {
    httpOnly: true,
    // Always Secure. Localhost browsers will still accept the cookie over
    // http://localhost; this only blocks cleartext sessions on staging /
    // preview / non-prod hosted environments, which is what we want.
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    ...(domain ? { domain } : {}),
  };
}

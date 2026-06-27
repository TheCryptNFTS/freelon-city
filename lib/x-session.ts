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
  /**
   * A wallet address this session has PROVEN control of via a one-time
   * personal_sign (see /api/x/prove). Unlike `bind` — which is an
   * attacker-chooseable string set at OAuth start with NO proof — `walletProof`
   * is only ever written after a signature verifies. Money-moving routes MUST
   * authorize against this field (requireProvenWallet), never against `bind`.
   */
  walletProof?: string;
  exp: number;
};

// Canonical proof message lives in the shared (node-free) module so the client
// signer and this server verifier never drift. Re-exported for existing importers.
export { walletProofMessage } from "./wallet-proof";

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
    ...(input.walletProof ? { walletProof: input.walletProof.toLowerCase() } : {}),
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

const ADDR_RE = /^0x[a-f0-9]{40}$/;

/**
 * Returns the wallet this session has PROVEN control of (via /api/x/prove),
 * lowercased, or null. This is the only trustworthy wallet-authority signal on
 * a session — use it (not `bind`) to gate anything that moves ⬡ or value.
 */
export function getProvenWallet(req: Request): string | null {
  const s = getSessionFromRequest(req);
  const w = (s?.walletProof || "").toLowerCase();
  return ADDR_RE.test(w) ? w : null;
}

/**
 * Money-path gate: the caller must hold a session whose PROVEN wallet matches
 * `expected`. Closes the bind-forgery vector — `bind` is attacker-chooseable at
 * OAuth start, so it can never authorize a spend; only a signature can.
 */
export function requireProvenWallet(req: Request, expected: string): XSession | null {
  const s = getSessionFromRequest(req);
  if (!s) return null;
  const w = (s.walletProof || "").toLowerCase();
  if (!ADDR_RE.test(w)) return null;
  if (w !== expected.toLowerCase()) return null;
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
 * Fail-CLOSED same-origin check for value-moving POSTs (HEX spends, payments)
 * that are reached ONLY from the browser behind a proven-wallet / bound session.
 *
 * isSameOrigin() deliberately ACCEPTS a request with no Origin AND no Referer so
 * legitimate non-browser callers (curl, server-to-server, wallet-signature flows)
 * still work. But a route gated by requireProvenWallet/a bound x-session cookie is
 * only ever hit by a real browser, which always sends at least one of those
 * headers. For those routes, a missing-both request is anomalous, so we reject it
 * — closing the residual CSRF/forgery surface. Use ONLY where there is no
 * non-browser (signature/server) auth path; otherwise use isSameOrigin().
 */
export function isSameOriginStrict(req: Request): boolean {
  const hasOrigin = !!req.headers.get("origin");
  const hasReferer = !!req.headers.get("referer");
  if (!hasOrigin && !hasReferer) return false;
  return isSameOrigin(req);
}

/**
 * 2026-05-30 — the site serves on both freeloncity.com (apex) and
 * www.freeloncity.com. Auth cookies were host-only, so a session set on one
 * host wasn't sent on the other → users appeared logged out / OAuth looped.
 * Scope auth cookies to the registrable domain so they span apex + www.
 * Returns undefined off-prod (localhost, *.vercel.app) so those keep working
 * with plain host-only cookies. Pass the request's Host header.
 */
export function authCookieDomainForHost(host: string | null | undefined): string | undefined {
  const h = (host || "").split(":")[0].toLowerCase();
  if (h === "freeloncity.com" || h.endsWith(".freeloncity.com")) {
    return ".freeloncity.com";
  }
  return undefined;
}

export function authCookieDomain(req: Request): string | undefined {
  return authCookieDomainForHost(req.headers.get("host"));
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

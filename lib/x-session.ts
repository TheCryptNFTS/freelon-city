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

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

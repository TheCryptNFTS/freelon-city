import crypto from "node:crypto";

/** PKCE helpers — RFC 7636 */
export function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function generateCodeVerifier(): string {
  // 64 bytes → 86 chars after base64url — well within 43..128 limit
  return base64url(crypto.randomBytes(64));
}

export function codeChallengeFromVerifier(verifier: string): string {
  return base64url(crypto.createHash("sha256").update(verifier).digest());
}

export function generateState(): string {
  return base64url(crypto.randomBytes(32));
}

// Browser-facing authorize URL MUST be x.com (2026-06-11, holder-diagnosed):
// the X app registers x.com universal links — the old twitter.com host broke
// the login handoff on mobile entirely and hung some desktops. A holder
// literally fixed it by hand-editing the URL to x.com. The api.twitter.com
// hosts below are server-side fetches (no browser/app involved) and work.
export const X_AUTH_URL = "https://x.com/i/oauth2/authorize";
export const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
export const X_USER_URL = "https://api.twitter.com/2/users/me";

/** Scopes — we only need identity + handle */
export const SCOPES = ["users.read", "tweet.read", "offline.access"];

export function redirectUri(): string {
  const env = process.env.X_OAUTH_REDIRECT_URI;
  if (env) return env;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/x/callback`;
}

export function clientCredentials(): { id: string; secret: string } {
  const id = process.env.X_OAUTH_CLIENT_ID;
  const secret = process.env.X_OAUTH_CLIENT_SECRET;
  if (!id || !secret) throw new Error("X OAuth credentials not configured");
  return { id, secret };
}

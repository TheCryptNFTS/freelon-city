import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import {
  X_AUTH_URL,
  SCOPES,
  generateCodeVerifier,
  codeChallengeFromVerifier,
  generateState,
  redirectUri,
  clientCredentials,
} from "@/lib/x-oauth";
import { authCookieDomain } from "@/lib/x-session";

export const dynamic = "force-dynamic";

/**
 * GET /api/x/start?bind=<wallet|handle>
 * Begins X OAuth 2.0 PKCE flow. Stores code_verifier + state + bind target in
 * HttpOnly cookies, then redirects the user to X for authorization.
 */
export async function GET(req: Request) {
  const rl = await limit(req, "x:start", { max: 20, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const url = new URL(req.url);
  const bind = url.searchParams.get("bind") || "";
  if (!bind || bind.length > 80) {
    return NextResponse.json({ error: "missing_bind" }, { status: 400 });
  }
  // Tight allowlist: address OR alphanumeric handle.
  // Reject javascript:, URLs, garbage, scripts etc.
  const isAddr = /^0x[a-fA-F0-9]{40}$/.test(bind);
  const isHandle = /^[a-zA-Z0-9_]{1,32}$/.test(bind);
  if (!isAddr && !isHandle) {
    return NextResponse.json({ error: "invalid_bind" }, { status: 400 });
  }

  let id: string;
  try {
    ({ id } = clientCredentials());
  } catch {
    return NextResponse.json({ error: "x_not_configured" }, { status: 500 });
  }

  const verifier = generateCodeVerifier();
  const challenge = codeChallengeFromVerifier(verifier);
  const state = generateState();

  const authUrl = new URL(X_AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", id);
  authUrl.searchParams.set("redirect_uri", redirectUri());
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authUrl.toString());
  // 2026-05-30 — the real cause of the X-connect loop was a HOST SPLIT, not
  // SameSite. The site serves on both freeloncity.com (apex, 308→www) and
  // www.freeloncity.com; these flow cookies were HOST-ONLY (no Domain), so a
  // cookie set on one host vanished when the OAuth callback landed on the
  // other → "missing_cookies" → bounce to /carrier → the loop, for whichever
  // users were on the non-canonical host.
  //   Fix: scope the cookies to Domain=.freeloncity.com so they're sent on
  //   apex AND www regardless of the redirect dance.
  //   SameSite stays "lax" — for a TOP-LEVEL OAuth redirect (the browser URL
  //   bar navigates to x.com and back) lax DOES send the cookie; "none" would
  //   make it third-party and risk Safari/ITP/Brave blocking it outright. lax
  //   is the correct, robust choice here.
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes
    ...(authCookieDomain(req) ? { domain: authCookieDomain(req) } : {}),
  };
  res.cookies.set("x_pkce_verifier", verifier, cookieOpts);
  res.cookies.set("x_oauth_state", state, cookieOpts);
  res.cookies.set("x_bind", bind, cookieOpts);
  return res;
}

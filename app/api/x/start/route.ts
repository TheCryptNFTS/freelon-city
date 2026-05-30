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
  // 2026-05-29 fix — the X-connect "loops back to login" bug. These PKCE/
  // state/bind cookies must survive the cross-site round-trip to x.com and
  // back to /api/x/callback. With sameSite:"lax" they were getting dropped
  // on the return navigation in in-app browsers (MetaMask's webview, iOS
  // Safari) and some redirect chains — so the callback saw "missing_cookies"
  // and bounced to /carrier, i.e. the loop. sameSite:"none" (valid only with
  // secure:true, which we already set) is the standard, correct setting for
  // OAuth flow cookies: it explicitly permits the cookie on the cross-site
  // redirect. They're short-lived (10 min) and HttpOnly, so this is safe.
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    maxAge: 600, // 10 minutes
  };
  res.cookies.set("x_pkce_verifier", verifier, cookieOpts);
  res.cookies.set("x_oauth_state", state, cookieOpts);
  res.cookies.set("x_bind", bind, cookieOpts);
  return res;
}

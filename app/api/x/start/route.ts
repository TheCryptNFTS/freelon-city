import { NextResponse } from "next/server";
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
  const url = new URL(req.url);
  const bind = url.searchParams.get("bind") || "";
  if (!bind || bind.length > 80) {
    return NextResponse.json({ error: "missing_bind" }, { status: 400 });
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
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes
  };
  res.cookies.set("x_pkce_verifier", verifier, cookieOpts);
  res.cookies.set("x_oauth_state", state, cookieOpts);
  res.cookies.set("x_bind", bind, cookieOpts);
  return res;
}

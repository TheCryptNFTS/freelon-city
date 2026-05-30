import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  X_TOKEN_URL,
  X_USER_URL,
  redirectUri,
  clientCredentials,
} from "@/lib/x-oauth";
import { setXVerification } from "@/lib/x-store";
import { signSession, X_SESSION_COOKIE, sessionCookieOptions, authCookieDomain } from "@/lib/x-session";
import { setReferrer } from "@/lib/referral-store";
import { normalizeHandle } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * GET /api/x/callback?code=...&state=...
 * Receives X's redirect, exchanges code for access token, fetches the X user,
 * stores verification keyed by the bind target, then redirects to /carrier.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/carrier?x_error=missing_code", url.origin));
  }

  const c = await cookies();
  const verifier = c.get("x_pkce_verifier")?.value;
  const expectedState = c.get("x_oauth_state")?.value;
  const bind = c.get("x_bind")?.value;

  if (!verifier || !expectedState || !bind) {
    return NextResponse.redirect(new URL("/carrier?x_error=missing_cookies", url.origin));
  }
  if (state !== expectedState) {
    return NextResponse.redirect(new URL("/carrier?x_error=state_mismatch", url.origin));
  }

  let creds: { id: string; secret: string };
  try {
    creds = clientCredentials();
  } catch {
    return NextResponse.redirect(new URL("/carrier?x_error=not_configured", url.origin));
  }

  // Exchange code → access token (Confidential client: HTTP Basic auth)
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: creds.id,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  const basic = Buffer.from(`${creds.id}:${creds.secret}`).toString("base64");

  const tokRes = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!tokRes.ok) {
    const text = await tokRes.text();
    console.error("x token exchange failed", tokRes.status, text);
    return NextResponse.redirect(
      new URL(`/carrier?x_error=token_${tokRes.status}`, url.origin),
    );
  }
  const tok = (await tokRes.json()) as { access_token?: string };
  if (!tok.access_token) {
    return NextResponse.redirect(new URL("/carrier?x_error=no_access_token", url.origin));
  }

  // Fetch the verified X user
  const userRes = await fetch(X_USER_URL, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
    cache: "no-store",
  });
  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/carrier?x_error=user_fetch", url.origin));
  }
  const userJson = (await userRes.json()) as {
    data?: { id?: string; username?: string };
  };
  const xId = userJson.data?.id;
  const xHandle = userJson.data?.username;
  if (!xId || !xHandle) {
    return NextResponse.redirect(new URL("/carrier?x_error=bad_user", url.origin));
  }

  await setXVerification(bind, {
    xId,
    xHandle,
    verifiedAt: Date.now(),
  });

  // Bind referral if a pending referrer cookie is set and not self-referral.
  const refCookie = c.get("freelon_ref")?.value;
  if (refCookie) {
    const referrer = normalizeHandle(refCookie);
    const joiner = normalizeHandle(xHandle);
    if (referrer && joiner && referrer !== joiner) {
      try {
        await setReferrer(joiner, referrer);
      } catch {
        // best-effort; do not block verification flow
      }
    }
  }

  const res = NextResponse.redirect(
    new URL(`/carrier?x_verified=${encodeURIComponent(xHandle)}`, url.origin),
  );
  // Issue a 7-day HMAC-signed session cookie binding this browser to xHandle.
  // Domain-scoped (.freeloncity.com) so it's readable on apex AND www — see
  // authCookieDomain. Without this, a session set on the callback host wasn't
  // sent on the other host → "logged out" / loop.
  const session = signSession({ xId, xHandle, bind });
  res.cookies.set(X_SESSION_COOKIE, session, sessionCookieOptions(req));
  // Clear flow cookies. Must pass the same domain used when setting them, or
  // the delete won't match the domain-scoped cookie.
  const domain = authCookieDomain(req);
  const clearOpts = domain ? { domain, path: "/" } : { path: "/" };
  res.cookies.delete({ name: "x_pkce_verifier", ...clearOpts });
  res.cookies.delete({ name: "x_oauth_state", ...clearOpts });
  res.cookies.delete({ name: "x_bind", ...clearOpts });
  // freelon_ref is now domain-scoped when set on prod (see /sync); clear it
  // with the same domain, plus a host-only clear for any legacy cookie.
  res.cookies.delete({ name: "freelon_ref", ...clearOpts });
  if (domain) res.cookies.delete("freelon_ref");
  return res;
}

/**
 * READ-ONLY X credentials probe (2026-06-10, audit follow-up).
 *
 * Answers two ops questions from the PRODUCTION runtime — the only place the
 * real X secrets exist (they're Sensitive in Vercel, so `vercel env pull`
 * returns blanks and nothing local can verify them):
 *   1. Which account owns X_ACCESS_TOKEN? The crons post as that account —
 *      it must be @4040hex.
 *   2. What plan tier is the app on? The rate-limit headers betray it (the
 *      Free tier's users/me cap is 25/24h; Basic is an order of magnitude up).
 *
 * GET /2/users/me only — no write, and no secret is ever echoed back.
 * Auth: Bearer CRON_SECRET or OPS_PROBE_SECRET, fail-closed (no secrets set →
 * everything 401s).
 */
import { NextResponse } from "next/server";
import { oauth1Header } from "@/lib/x-dm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const ok = [process.env.CRON_SECRET, process.env.OPS_PROBE_SECRET]
    .filter(Boolean)
    .some((s) => auth === `Bearer ${s}`);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const credsPresent = !!(
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_TOKEN_SECRET
  );
  if (!credsPresent) {
    return NextResponse.json({
      credsPresent,
      hint: "Set X_API_KEY/_SECRET + X_ACCESS_TOKEN/_SECRET (token pair minted while logged in as @4040hex) in Vercel env — the posting crons dry-run until then.",
    });
  }

  const url = "https://api.x.com/2/users/me";
  const header = oauth1Header({ method: "GET", url });
  if (!header) return NextResponse.json({ credsPresent, error: "oauth_header_failed" }, { status: 500 });

  const res = await fetch(url, {
    headers: { Authorization: header },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { username?: string; name?: string };
    title?: string;
  };
  const h = (n: string) => res.headers.get(n);
  return NextResponse.json({
    credsPresent,
    status: res.status,
    username: body?.data?.username ?? null,
    name: body?.data?.name ?? null,
    rate15m: { limit: h("x-rate-limit-limit"), remaining: h("x-rate-limit-remaining") },
    cap24h: { app: h("x-app-limit-24hour-limit"), user: h("x-user-limit-24hour-limit") },
    error: body?.title ?? null,
  });
}

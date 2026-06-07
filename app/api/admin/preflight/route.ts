import { NextResponse } from "next/server";

/**
 * GET /api/admin/preflight
 * Header: X-Admin-Token: <ADMIN_PREFLIGHT_TOKEN>
 *
 * Verifies that the production environment is fully wired. Reports:
 *   - which env vars are set (boolean only — never the value)
 *   - live connectivity to Upstash, OpenSea, the contract RPC
 *   - any obvious misconfigurations
 *
 * Hit this on the deployed Vercel URL immediately after setting env vars
 * to confirm before opening the door to real users. Returns 200 if
 * everything is green, 503 if any required check failed.
 *
 * Auth gate: must include X-Admin-Token header matching ADMIN_PREFLIGHT_TOKEN
 * env var. If ADMIN_PREFLIGHT_TOKEN is not set, the endpoint is disabled
 * entirely (returns 404) — fail-closed for a debug surface.
 */

export const dynamic = "force-dynamic";

type EnvField = { name: string; required: boolean; set: boolean };
type LiveCheck = { name: string; status: "ok" | "fail" | "skipped"; detail?: string; ms?: number };

const REQUIRED_ENV = [
  "OPENSEA_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "CRON_SECRET",
  "X_OAUTH_CLIENT_ID",
  "X_OAUTH_CLIENT_SECRET",
  "NEXT_PUBLIC_BASE_URL",
];

const OPTIONAL_ENV = [
  "X_OAUTH_REDIRECT_URI",
  "X_API_KEY",
  "X_API_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
  "ETH_RPC_URL",
  "NEXT_PUBLIC_ETH_RPC_URL",
  "ADMIN_PREFLIGHT_TOKEN",
];

async function pingUpstash(): Promise<LiveCheck> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { name: "upstash", status: "skipped", detail: "creds missing" };
  const t0 = Date.now();
  try {
    const r = await fetch(`${url}/PING`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const ms = Date.now() - t0;
    if (!r.ok) return { name: "upstash", status: "fail", detail: `http ${r.status}`, ms };
    return { name: "upstash", status: "ok", ms };
  } catch (e) {
    return { name: "upstash", status: "fail", detail: e instanceof Error ? e.message.slice(0, 60) : "unknown", ms: Date.now() - t0 };
  }
}

async function pingOpensea(): Promise<LiveCheck> {
  const key = process.env.OPENSEA_API_KEY;
  if (!key) return { name: "opensea", status: "skipped", detail: "no key" };
  const t0 = Date.now();
  try {
    const r = await fetch("https://api.opensea.io/api/v2/collections/freelons/stats", {
      headers: { "X-API-KEY": key },
      cache: "no-store",
    });
    const ms = Date.now() - t0;
    if (!r.ok) return { name: "opensea", status: "fail", detail: `http ${r.status}`, ms };
    return { name: "opensea", status: "ok", ms };
  } catch (e) {
    return { name: "opensea", status: "fail", detail: e instanceof Error ? e.message.slice(0, 60) : "unknown", ms: Date.now() - t0 };
  }
}

async function pingRpc(): Promise<LiveCheck> {
  // Match lib/wallet-tokens.ts: try configured RPC first, then the same
  // 4 public fallbacks viem uses via fallback(). Only report fail when
  // ALL endpoints reject — the actual site behaves the same way.
  const configured = process.env.ETH_RPC_URL || process.env.NEXT_PUBLIC_ETH_RPC_URL;
  const urls = [
    ...(configured ? [configured] : []),
    "https://eth-pokt.nodies.app",
    "https://eth.rpc.blxrbdn.com",
    "https://ethereum-rpc.publicnode.com",
    "https://eth.drpc.org",
  ];
  const t0 = Date.now();
  const errors: string[] = [];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
        cache: "no-store",
      });
      if (!r.ok) { errors.push(`${new URL(url).host}:${r.status}`); continue; }
      const j = await r.json();
      if (!j.result) { errors.push(`${new URL(url).host}:no-result`); continue; }
      const ms = Date.now() - t0;
      return { name: "rpc", status: "ok", detail: `block ${parseInt(j.result, 16)} via ${new URL(url).host}`, ms };
    } catch (e) {
      errors.push(`${new URL(url).host}:${e instanceof Error ? e.message.slice(0, 30) : "err"}`);
      continue;
    }
  }
  return { name: "rpc", status: "fail", detail: errors.join(" | ").slice(0, 200), ms: Date.now() - t0 };
}

function checkOauthRedirect(): LiveCheck {
  const redirect = process.env.X_OAUTH_REDIRECT_URI;
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!redirect && !base) {
    return { name: "x_oauth_redirect", status: "fail", detail: "neither X_OAUTH_REDIRECT_URI nor NEXT_PUBLIC_BASE_URL set" };
  }
  const effective = redirect || `${base}/api/x/callback`;
  if (!effective.startsWith("https://") && !effective.startsWith("http://localhost")) {
    return { name: "x_oauth_redirect", status: "fail", detail: `must be https (got: ${effective.slice(0, 40)})` };
  }
  if (!effective.endsWith("/api/x/callback")) {
    return { name: "x_oauth_redirect", status: "fail", detail: "must end with /api/x/callback" };
  }
  return { name: "x_oauth_redirect", status: "ok", detail: effective };
}

export async function GET(req: Request) {
  // Auth gate: require ADMIN_PREFLIGHT_TOKEN header match. If the env var
  // itself isn't set, the endpoint refuses to respond — a debug surface
  // must never be open by default.
  const adminToken = process.env.ADMIN_PREFLIGHT_TOKEN;
  if (!adminToken) {
    return NextResponse.json({ error: "preflight_disabled" }, { status: 404 });
  }
  const provided = req.headers.get("x-admin-token");
  if (provided !== adminToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const env: EnvField[] = [
    ...REQUIRED_ENV.map((name) => ({ name, required: true, set: !!process.env[name] })),
    ...OPTIONAL_ENV.map((name) => ({ name, required: false, set: !!process.env[name] })),
  ];

  const [upstash, opensea, rpc] = await Promise.all([
    pingUpstash(),
    pingOpensea(),
    pingRpc(),
  ]);
  const oauthRedirect = checkOauthRedirect();

  const missing = env.filter((e) => e.required && !e.set).map((e) => e.name);
  const failed = [upstash, opensea, rpc, oauthRedirect].filter((c) => c.status === "fail").map((c) => c.name);

  const status = missing.length === 0 && failed.length === 0 ? "ready" : "incomplete";

  return NextResponse.json(
    {
      status,
      vercelEnv: process.env.VERCEL_ENV || "local",
      nodeEnv: process.env.NODE_ENV,
      missing,
      failed,
      env,
      checks: { upstash, opensea, rpc, oauthRedirect },
    },
    {
      status: status === "ready" ? 200 : 503,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

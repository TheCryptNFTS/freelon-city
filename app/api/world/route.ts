/**
 * FREELON WORLD route — the server-authoritative seam for the open-world sim
 * slice (/world/city). Mirrors the existing lib/*-store.ts → route.ts shape used
 * everywhere else in this app (play-event, progression, city/boost).
 *
 *   GET  /api/world[?owner=<handle>]        → { ok, mode, owner, state, balance }
 *   POST /api/world  { action:"build", owner, idx }      DEMO  (in-world stipend)
 *   POST /api/world  { action:"build_real", idx }        REAL  (sinks real HEX)
 *
 * TWO MODES (security review 2026-06-27):
 *  - DEMO: anonymous / handle-only visitors. Spends the throwaway 500-HEX in-world
 *    stipend, keyed on a sanitized handle. No real value moves. This keeps the
 *    slice publicly playable for cold visitors who haven't connected a wallet.
 *  - REAL: a session that has CRYPTOGRAPHICALLY PROVEN a wallet (via /api/x/prove).
 *    Building SINKS the player's real per-wallet HEX. Auth mirrors /api/city/boost
 *    EXACTLY (same-origin + valid X session + proven wallet) and the spender is
 *    DERIVED FROM THE SESSION — never a client-supplied address — so there is no
 *    IDOR drain vector. A rejected build returns the authoritative state to
 *    reconcile; it never throws an HTTP error for a normal rejection.
 *
 * Same-origin in prod (freeloncity.com/world/city → /api/world). The static dev
 * copy (port 8868) has no /api, so the client degrades to its localStorage ledger.
 */
import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { requireXSession } from "@/lib/require-x";
import { getProvenWallet, isSameOrigin } from "@/lib/x-session";
import { getWalletHex } from "@/lib/wallet-hex-store";
import {
  normalizeOwner,
  getWorld,
  registerVisit,
  buildPlot,
  buildPlotForWallet,
  BUILD_COST,
} from "@/lib/world-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET → load the player's world. If the session has a proven wallet we return
 * REAL mode (keyed on the wallet, with the real ledger balance); otherwise DEMO
 * mode keyed on the ?owner= handle. A GET counts as a "visit" (greeter memory).
 */
export async function GET(req: Request) {
  const rl = await limit(req, "world-get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const wallet = getProvenWallet(req);
  if (wallet) {
    const state = await registerVisit(wallet);
    const ledger = await getWalletHex(wallet);
    return NextResponse.json({
      ok: true,
      mode: "wallet",
      owner: wallet,
      state,
      balance: ledger.balance, // REAL HEX — what the client spends/shows
      buildCost: BUILD_COST,
    });
  }

  const url = new URL(req.url);
  const owner = normalizeOwner(url.searchParams.get("owner") || "");
  if (!owner) return NextResponse.json({ ok: false, error: "bad_owner" }, { status: 400 });
  const state = await registerVisit(owner);
  return NextResponse.json({
    ok: true,
    mode: "demo",
    owner,
    state,
    balance: state.hex, // in-world stipend, non-real
    buildCost: BUILD_COST,
  });
}

type InBody = { owner?: string; action?: string; idx?: number };

export async function POST(req: Request) {
  const rl = await limit(req, "world-build", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  let body: InBody;
  try {
    body = (await req.json()) as InBody;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  // ─── REAL build: sinks real HEX. Auth mirrors /api/city/boost exactly. ───
  if (body.action === "build_real") {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ ok: false, error: "bad_origin" }, { status: 403 });
    }
    const session = await requireXSession(req, {});
    if (session instanceof NextResponse) return session;

    // The spender is the wallet THIS SESSION has proven — never a body string.
    const wallet = getProvenWallet(req);
    if (!wallet) {
      return NextResponse.json(
        { ok: false, error: "wallet_proof_required", message: "Sign with your wallet once to build with ⬡." },
        { status: 401 },
      );
    }

    const res = await buildPlotForWallet(wallet, Number(body.idx));
    if (res.ok) {
      return NextResponse.json({ ok: true, mode: "wallet", state: res.state, balance: res.balance });
    }
    const status = res.reason === "insufficient_hex" ? 402 : res.reason === "busy" ? 503 : 200;
    return NextResponse.json(
      { ok: false, mode: "wallet", reason: res.reason, state: res.state, balance: res.balance },
      { status },
    );
  }

  // ─── DEMO build: in-world stipend only, keyed on a handle. No real value. ───
  if (body.action === "build") {
    const owner = normalizeOwner(body.owner || "");
    if (!owner) return NextResponse.json({ ok: false, error: "bad_owner" }, { status: 400 });
    const res = await buildPlot(owner, Number(body.idx));
    return NextResponse.json(
      res.ok
        ? { ok: true, mode: "demo", state: res.state }
        : { ok: false, mode: "demo", reason: res.reason, state: res.state },
    );
  }

  // Unknown action — return current demo state so the client can still reconcile.
  const owner = normalizeOwner(body.owner || "");
  const state = owner ? await getWorld(owner) : null;
  return NextResponse.json({ ok: false, error: "bad_action", state }, { status: 400 });
}

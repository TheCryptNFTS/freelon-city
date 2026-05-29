import { NextResponse } from "next/server";
import { isValidAddress, getWalletTokens } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import {
  buildStructure,
  CityBuildError,
  derivedCastes,
  getCityState,
} from "@/lib/city-store";
import { civsLitAt, STRUCTURE_BY_KEY } from "@/lib/city-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/city/build  { address, key }
 * Raise one structure. Caste-gated builds are verified against on-chain
 * ownership (never client claims): the structure's required caste must be in
 * the wallet's verified caste set. Cost + affordability are enforced server
 * side against the freshly-accrued spendable balance.
 */
export async function POST(req: Request) {
  const rl = await limit(req, "city:build", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { address?: string; key?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const address = (body.address || "").toLowerCase();
  const key = (body.key || "").trim();
  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  const struct = STRUCTURE_BY_KEY[key];
  if (!struct) {
    return NextResponse.json({ error: "unknown_structure" }, { status: 400 });
  }

  // Verify ownership for the multiplier + caste gating.
  let balance = 0;
  let castes = derivedCastes([]);
  try {
    const tokens = await getWalletTokens(address, 500);
    if (tokens) {
      balance = tokens.balance;
      castes = derivedCastes(tokens.tokenIds);
    }
  } catch {
    /* treat as non-holder if ownership lookup fails */
  }

  // Caste-gated structures require holding that caste.
  if (struct.caste !== null && !castes.includes(struct.caste)) {
    return NextResponse.json(
      { error: "caste_locked", requires: struct.caste },
      { status: 403 },
    );
  }

  try {
    const wallet = await buildStructure(address, key, castes, { balance, castes });
    const state = await getCityState();
    return NextResponse.json({
      state: {
        season: state.season,
        totalSignal: state.totalSignal,
        lit: civsLitAt(state.totalSignal),
      },
      wallet: {
        signal: wallet.signal,
        contributed: wallet.contributed,
        structures: wallet.structures,
        balance: wallet.balance,
        castes: wallet.castes,
      },
    });
  } catch (e) {
    if (e instanceof CityBuildError) {
      const status = e.code === "insufficient_signal" ? 402 : 403;
      return NextResponse.json({ error: e.code, detail: e.message }, { status });
    }
    return NextResponse.json({ error: "build_failed" }, { status: 500 });
  }
}

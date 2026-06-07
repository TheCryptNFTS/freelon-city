import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { getName, setName, validName } from "@/lib/name-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { debitWalletHex, getWalletHex } from "@/lib/wallet-hex-store";
import { ECONOMY } from "@/lib/economy-constants";
import { verifyOwnership } from "@/lib/owner-of";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "name-get", { max: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const rec = await getName(cid);
  return NextResponse.json({ id: cid, record: rec });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "name-post", { max: 6 });
  if (!rl.ok) return tooManyResponse(rl);

  // CSRF: same-origin only. Wallet auth is already enforced via signature.
  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    address?: string;
    signature?: string;
  };
  const name = body.name?.trim();
  const address = body.address?.toLowerCase();
  const signature = body.signature;

  if (!name || !validName(name)) {
    return NextResponse.json({ error: "invalid name (1-32 chars, A-Z 0-9 space _ -)" }, { status: 400 });
  }
  if (!address || !signature) {
    return NextResponse.json({ error: "address + signature required" }, { status: 400 });
  }

  const message = `I am setting the display name of FREELON CITY citizen #${cid} to "${name}".`;

  let sigOk = false;
  try {
    sigOk = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    sigOk = false;
  }
  if (!sigOk) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });

  // Multi-source ownership check (RPC ownerOf with 4-RPC fallback, then
  // OpenSea-backed wallet/tokens). Fixes the Discord bug where a single
  // rate-limited RPC produced "could not verify ownership" for real holders.
  const verdict = await verifyOwnership(cid, address);
  if (verdict.status === "unknown") {
    return NextResponse.json(
      { error: "⬡ SIGNAL WEAK · couldn't reach the chain just now · wait a moment and retry. Your ownership is safe on-chain." },
      { status: 503 },
    );
  }
  if (verdict.status === "not-owner") {
    return NextResponse.json({ error: "you do not own this citizen" }, { status: 403 });
  }

  // Collapse-mode sink discount — naming costs less when the city is
  // dimming, so balances actually burn.
  const { getCollapseState, applySinkMultiplier } = await import("@/lib/collapse-mode");
  const collapse = await getCollapseState();
  const cost = applySinkMultiplier(ECONOMY.NAMING_COST, collapse);

  // Hex burn — NAMING_COST. Verify balance first to give a friendly error,
  // then debit (debitWalletHex itself throws on insufficient as a safety net).
  const rec = await getWalletHex(address);
  if (rec.balance < cost) {
    return NextResponse.json(
      {
        error: "insufficient_hex",
        required: cost,
        balance: rec.balance,
      },
      { status: 402 },
    );
  }
  try {
    await debitWalletHex(address, cost, {
      kind: "manual",
      note: `Naming · #${String(cid).padStart(4, "0")} → "${name}"${collapse.active ? ` · COLLAPSE -${Math.round((1 - collapse.sinkMultiplier) * 100)}%` : ""}`,
    });
  } catch {
    return NextResponse.json({ error: "debit_failed" }, { status: 402 });
  }

  await setName(cid, name, address);
  return NextResponse.json({
    ok: true,
    name,
    owner: address,
    burned: cost,
    collapseDiscountApplied: collapse.active,
    originalCost: ECONOMY.NAMING_COST,
  });
}

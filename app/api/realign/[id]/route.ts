import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { CIVILIZATIONS } from "@/lib/constants";
import { getCitizen } from "@/lib/citizens";
import { getCarrier } from "@/lib/carrier-store";
import { normalizeHandle } from "@/lib/sync";
import { getRealignment, setRealignment } from "@/lib/realignment-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { ECONOMY } from "@/lib/economy-constants";
import { getXVerification } from "@/lib/x-store";
import { verifyOwnership } from "@/lib/owner-of";
import { foldCarrierIntoWallet } from "@/lib/hex-spend";
import { debitWalletHex, getWalletHex, InsufficientHexError } from "@/lib/wallet-hex-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOLDOWN_MS = 90 * 86400000;
const REALIGN_COST = ECONOMY.REALIGN_COST;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "realign-get", { max: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const rec = await getRealignment(cid);
  return NextResponse.json({ id: cid, record: rec });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "realign", { max: 4 });
  if (!rl.ok) return tooManyResponse(rl);

  // CSRF: same-origin only. Wallet auth already enforced via signature + X bind.
  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const citizen = getCitizen(cid);
  if (!citizen) return NextResponse.json({ error: "citizen not found" }, { status: 404 });

  if (citizen.tier !== "Common") {
    return NextResponse.json(
      { error: "realignment is only available for Common-tier citizens" },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    targetCiv?: string;
    address?: string;
    signature?: string;
    handle?: string;
  };

  const targetCiv = (body.targetCiv ?? "").trim();
  const address = body.address?.toLowerCase();
  const signature = body.signature;
  const handle = normalizeHandle(body.handle ?? "");

  if (!address || !signature) {
    return NextResponse.json({ error: "address + signature required" }, { status: 400 });
  }
  if (!handle) {
    return NextResponse.json({ error: "carrier handle required" }, { status: 400 });
  }

  const validCivs = Object.keys(CIVILIZATIONS);
  if (!targetCiv || !validCivs.includes(targetCiv)) {
    return NextResponse.json({ error: "invalid targetCiv" }, { status: 400 });
  }

  const originalCiv = citizen.civilization;
  if (targetCiv === originalCiv) {
    return NextResponse.json({ error: "target must differ from original civilization" }, { status: 400 });
  }

  const existing = await getRealignment(cid);
  if (existing) {
    const elapsed = Date.now() - existing.setAt;
    if (elapsed < COOLDOWN_MS) {
      const nextEligibleAt = existing.setAt + COOLDOWN_MS;
      return NextResponse.json(
        {
          error: "cooldown active",
          nextEligibleAt,
          cooldownMs: COOLDOWN_MS,
        },
        { status: 429 },
      );
    }
  }

  const message = `I am realigning FREELON CITY citizen #${cid} from ${originalCiv} to ${targetCiv}.`;

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

  // Multi-source ownership check — see lib/owner-of.ts. Stops the
  // "could not verify ownership" false-negative when public RPCs throttle.
  const verdict = await verifyOwnership(cid, address);
  if (verdict.status === "unknown") {
    return NextResponse.json(
      { error: "⬡ SIGNAL DISRUPTED · the city couldn't read your chain credentials · retry" },
      { status: 503 },
    );
  }
  if (verdict.status === "not-owner") {
    return NextResponse.json({ error: "you do not own this citizen" }, { status: 403 });
  }

  // Bind check: the carrier handle being debited MUST be the X handle the
  // signing wallet verified. Otherwise an attacker could drain a victim's
  // hex by submitting their own valid signature with the victim's handle.
  const verification = await getXVerification(address);
  if (!verification || normalizeHandle(verification.xHandle) !== handle) {
    return NextResponse.json(
      { error: "handle not verified to this wallet" },
      { status: 403 },
    );
  }

  // Collapse-mode sink discount
  const { getCollapseState, applySinkMultiplier } = await import("@/lib/collapse-mode");
  const collapse = await getCollapseState();
  const cost = applySinkMultiplier(REALIGN_COST, collapse);

  // 2026-05-29 ledger unification: realign now spends the WALLET ledger.
  // The wallet is signature-proven above (verifyMessage + verifyOwnership),
  // so it's a trusted spend identity. Fold any leftover carrier-hex in first
  // (idempotent) so previously-earned hex is spendable.
  await foldCarrierIntoWallet(handle, address);
  try {
    await debitWalletHex(address, cost, {
      kind: "manual",
      note: `Realign #${cid} → ${targetCiv}`,
    });
  } catch (e) {
    if (e instanceof InsufficientHexError) {
      return NextResponse.json(
        { error: "insufficient hex points", required: e.requested, have: e.balance },
        { status: 402 },
      );
    }
    throw e;
  }

  const rec = {
    citizenId: cid,
    originalCiv,
    alignedCiv: targetCiv,
    owner: address,
    setAt: Date.now(),
  };
  await setRealignment(rec);

  const wrec = await getWalletHex(address);
  const folded = await getCarrier(handle);
  return NextResponse.json({
    ok: true,
    record: rec,
    cost,
    originalCost: REALIGN_COST,
    collapseDiscountApplied: collapse.active,
    walletBalance: wrec.balance,
    state: folded ? { ...folded, hexPoints: wrec.balance } : null,
  });
}

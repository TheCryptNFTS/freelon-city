import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { getCitizen } from "@/lib/citizens";
import { normalizeHandle } from "@/lib/sync";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getXVerification } from "@/lib/x-store";
import { verifyOwnership } from "@/lib/owner-of";
import { revert, getEvolution } from "@/lib/evolution-store";
import { addCitizenMemory } from "@/lib/progression-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/agent/evolve/revert — turn a citizen's art override OFF (FREE).
 *
 * Reverting restores the ORIGINAL anchored art on the dynamic metadata route,
 * byte-identical. It is FREE (no ⬡), reversible (re-evolving is cheap — the
 * render is kept as history), and NEVER destroys the original (the original is
 * the source of truth and is never stored-over).
 *
 * Auth mirrors /api/agent/evolve: same-origin + wallet signature + multi-source
 * ownership + handle→wallet bind check. Owner-gated so a third party can't
 * un-evolve someone else's citizen.
 */
export async function POST(req: Request) {
  const rl = await limit(req, "agent-evolve-revert", { max: 6, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    tokenId?: number;
    address?: string;
    signature?: string;
    handle?: string;
  };

  const tokenId = Math.floor(Number(body.tokenId));
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) {
    return NextResponse.json({ error: "invalid tokenId" }, { status: 400 });
  }
  if (!getCitizen(tokenId)) return NextResponse.json({ error: "citizen not found" }, { status: 404 });

  const address = body.address?.toLowerCase();
  const signature = body.signature;
  const handle = normalizeHandle(body.handle ?? "");
  if (!address || !signature) {
    return NextResponse.json({ error: "address + signature required" }, { status: 400 });
  }
  if (!handle) {
    return NextResponse.json({ error: "carrier handle required" }, { status: 400 });
  }

  const message = `I am reverting FREELON CITY agent #${tokenId} to its original art.`;
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

  const verdict = await verifyOwnership(tokenId, address);
  if (verdict.status === "unknown") {
    return NextResponse.json(
      { error: "⬡ SIGNAL WEAK · couldn't reach the chain just now · wait a moment and retry. Your ownership is safe on-chain." },
      { status: 503 },
    );
  }
  if (verdict.status === "not-owner") {
    return NextResponse.json({ error: "you do not own this citizen" }, { status: 403 });
  }

  const verification = await getXVerification(address);
  if (!verification || normalizeHandle(verification.xHandle) !== handle) {
    return NextResponse.json({ error: "handle not verified to this wallet" }, { status: 403 });
  }

  const before = await getEvolution(tokenId);
  const rec = await revert(tokenId);

  // Only log if this actually flipped something off (idempotent revert is a no-op).
  if (before.evolved) {
    await addCitizenMemory(tokenId, {
      type: "mission",
      description: "Reverted art to original",
      xpChange: 0,
      signalChange: 0,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, evolved: false, tokenId, tier: rec.tier });
}

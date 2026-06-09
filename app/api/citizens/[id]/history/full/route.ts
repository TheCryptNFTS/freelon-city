import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCitizen } from "@/lib/citizens";
import { getAgentHistory } from "@/lib/agent-history";
import { requireProvenWallet } from "@/lib/x-session";
import { ownerOf } from "@/lib/owner-of";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * OWNER-AUTHENTICATED FULL HISTORY (Build Sequence Prompt 7, 2026-06-09).
 *
 * The public `/api/citizens/[id]/agent` endpoint serves work history as PROOF
 * (kind/ability/task/timestamp) and currently still includes text `body`. Per
 * docs/OWNER_AUTH_HISTORY_ENDPOINT_SPEC.md the raw text body is the OWNER'S
 * MEMORY and must eventually be owner-only. This is the additive owner endpoint
 * that gate: it returns the full history (incl. text body) ONLY to the proven
 * wallet owner. Nothing else changes yet — the public endpoint is untouched and
 * the owner UI is migrated in Prompt 8, so this route is purely additive.
 *
 * Auth is STRICTER than /landing (which only confirms a supplied address owns
 * the token): here we require BOTH (1) requireProvenWallet — a one-time wallet
 * SIGNATURE proving the caller controls `address` — AND (2) ownerOf(cid) ===
 * that proven address. A bound-but-unsigned session, a wrong wallet, or an
 * unauthenticated caller gets 401/403 and NO body. The `brief` (the holder's
 * private input) is still stripped — it is rendered nowhere; owners get their
 * outputs, not their raw prompts.
 * ────────────────────────────────────────────────────────────────────────── */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:history:full", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040 || !getCitizen(cid)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const raw = new URL(req.url).searchParams.get("address") || "";
  const address = /^0x[a-fA-F0-9]{40}$/.test(raw) ? raw.toLowerCase() : null;
  if (!address) {
    return NextResponse.json({ error: "address_required" }, { status: 400 });
  }

  // (1) Prove the caller controls this wallet (one-time signature). A missing or
  // bound-but-unsigned session, or a session whose walletProof != address, fails.
  if (!requireProvenWallet(req, address)) {
    return NextResponse.json({ error: "wallet_proof_required" }, { status: 401 });
  }

  // (2) Confirm the proven wallet actually owns this citizen on-chain.
  const owner = await ownerOf(cid);
  if (!owner || owner.toLowerCase() !== address) {
    return NextResponse.json({ error: "not_owner" }, { status: 403 });
  }

  // Owner confirmed → full history incl. text body. Strip `brief` (private input,
  // rendered nowhere) to match the existing history contract shape.
  const history = (await getAgentHistory(cid)).map(({ brief: _brief, ...rest }) => rest);

  return NextResponse.json({ history });
}

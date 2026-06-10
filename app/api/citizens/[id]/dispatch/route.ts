import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { verifyOwnership } from "@/lib/owner-of";
import { getCitizen } from "@/lib/citizens";
import { upstash, hasUpstash } from "@/lib/upstash-client";
import { sendDispatch, getDispatchState } from "@/lib/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

// Atomic per-citizen-per-day claim (mirrors the job route). One dispatch per
// citizen per UTC day — the cap that stops the public record being flooded.
const claimMemory = new Map<string, number>();
async function claimOnce(key: string, ttlSec: number): Promise<boolean> {
  if (hasUpstash) {
    try {
      return (await upstash(["SET", key, "1", "NX", "EX", String(ttlSec)])) === "OK";
    } catch { /* fall through */ }
  }
  const exp = claimMemory.get(key);
  if (exp && exp > Date.now()) return false;
  claimMemory.set(key, Date.now() + ttlSec * 1000);
  return true;
}

// GET — public read of the dispatch state. Resolves a finished dispatch on the
// way (deterministic, idempotent, status-only) so the "while you were away"
// event lands whenever anyone next loads the citizen.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:dispatch:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const state = await getDispatchState(cid);
  return NextResponse.json(state);
}

// POST — send the citizen on a dispatch. Owner-gated (mirrors the job route:
// X-session bind, or a wallet signature), one per citizen per UTC day.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:dispatch", { max: 20, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { isSameOrigin, getSessionFromRequest } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040 || !getCitizen(cid)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { address?: string; signature?: string };

  // Auth — bound X-session (no signature), else a wallet signature. The actor is
  // the AUTHENTICATED wallet, never an unverified body field.
  let wallet: string | null = null;
  const session = getSessionFromRequest(req);
  if (session && /^0x[a-f0-9]{40}$/.test((session.bind || "").toLowerCase())) {
    wallet = session.bind.toLowerCase();
  } else if (body.address && body.signature) {
    const address = body.address.toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "invalid address" }, { status: 400 });
    }
    const message = `I am dispatching FREELON CITY citizen #${cid} into the city.`;
    let sigOk = false;
    try {
      sigOk = await verifyMessage({ address: address as `0x${string}`, message, signature: body.signature as `0x${string}` });
    } catch { sigOk = false; }
    if (!sigOk) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
    wallet = address;
  }
  if (!wallet) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const verdict = await verifyOwnership(cid, wallet);
  if (verdict.status === "unknown") {
    return NextResponse.json(
      { error: "⬡ SIGNAL WEAK · couldn't reach the chain just now · wait a moment and retry. Your ownership is safe on-chain." },
      { status: 503 },
    );
  }
  if (verdict.status === "not-owner") {
    return NextResponse.json({ error: "you do not own this citizen" }, { status: 403 });
  }

  // Resolve any finished prior dispatch first, then enforce the daily cap.
  const pre = await getDispatchState(cid);
  if (pre.status === "out") {
    return NextResponse.json({ already: true, message: "This citizen is already out in the city.", state: pre });
  }
  const claimKey = `freelon:dispatch:day:${cid}:${utcDay()}`;
  if (!(await claimOnce(claimKey, 24 * 60 * 60))) {
    return NextResponse.json({ already: true, message: "This citizen has already been dispatched today. Resets at UTC midnight." });
  }

  await sendDispatch(cid);
  // The public dispatch log + meta strip live on the ISR'd dossier — bust it
  // so the record reflects the send immediately (2026-06-10).
  revalidatePath(`/citizens/${cid}`);
  const state = await getDispatchState(cid);
  return NextResponse.json({ ok: true, state });
}

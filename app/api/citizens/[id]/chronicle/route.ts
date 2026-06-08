/**
 * THE CHRONICLE endpoint — the citizen's own evolving backstory.
 *   GET  → the chapters so far (public; it's the NFT's lore).
 *   POST → the owner adds the NEXT chapter: the agent writes it in-character,
 *          building on every prior chapter, so the story accretes and travels
 *          with the NFT on resale.
 *
 * Owner-gated + bounded (one cheap-model run per chapter, daily-capped). The
 * chronicle is keyed by tokenId, never by wallet — it belongs to the asset.
 */
import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/x-session";
import { verifyOwnership } from "@/lib/owner-of";
import { getCitizen } from "@/lib/citizens";
import { getProgress } from "@/lib/progression-store";
import { buildPersona } from "@/lib/missions/persona";
import { citizenReason } from "@/lib/missions/llm";
import { getChronicle, addChapter, chronicleDigest } from "@/lib/chronicle-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SIG_WINDOW_MS = 30 * 60 * 1000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!getCitizen(cid)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const chapters = await getChronicle(cid).catch(() => []);
  return NextResponse.json({ ok: true, chapters });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:chronicle", { max: 6, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const { id } = await params;
  const cid = parseInt(id, 10);
  const citizen = getCitizen(cid);
  if (!Number.isFinite(cid) || !citizen) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { address?: string; signature?: string; ts?: number };
  if (!body.address || !body.signature) return NextResponse.json({ error: "auth_required" }, { status: 401 });
  const address = body.address.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) return NextResponse.json({ error: "invalid address" }, { status: 400 });
  const ts = Number(body.ts);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SIG_WINDOW_MS) return NextResponse.json({ error: "auth_required" }, { status: 401 });
  const message = `I am writing the next chapter for FREELON CITY citizen #${cid} at ${ts}.`;
  let sigOk = false;
  try { sigOk = await verifyMessage({ address: address as `0x${string}`, message, signature: body.signature as `0x${string}` }); } catch { sigOk = false; }
  if (!sigOk) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });

  const verdict = await verifyOwnership(cid, address);
  if (verdict.status === "unknown") return NextResponse.json({ error: "ownership_unverified" }, { status: 503 });
  if (verdict.status === "not-owner") return NextResponse.json({ error: "not_owner" }, { status: 403 });

  const { agentsKilled, consumeFreeRun, refundFreeRun, RUN_COST_CENTS, claimDaily, releaseDaily } = await import("@/lib/missions/budget");
  if (agentsKilled()) return NextResponse.json({ error: "agents_offline", message: "The agents are briefly offline. Back shortly." }, { status: 503 });
  const day = new Date().toISOString().slice(0, 10);
  const dayKey = `freelon:chronicle:day:${cid}:${day}`;
  if (!(await claimDaily(dayKey, 3))) {
    return NextResponse.json({ error: "daily_limit", message: "This citizen has written enough today. Resets at UTC midnight." }, { status: 429 });
  }
  const bud = await consumeFreeRun(RUN_COST_CENTS.text);
  if (!bud.ok) { await releaseDaily(dayKey); return NextResponse.json({ error: "daily_capacity", message: "The agents hit today's free capacity — back at UTC midnight." }, { status: 503 }); }

  const progress = await getProgress(cid).catch(() => null);
  if (!progress) { await refundFreeRun(RUN_COST_CENTS.text); await releaseDaily(dayKey); return NextResponse.json({ error: "progress_unavailable" }, { status: 503 }); }
  const persona = buildPersona(citizen, progress);
  const prior = await getChronicle(cid).catch(() => []);
  const digest = chronicleDigest(prior);

  const userBrief = prior.length === 0
    ? "Write the FIRST chapter of your own chronicle — the origin of who you are becoming, in your voice. One vivid paragraph (4-6 sentences). Show your civilization and your nature; don't just state facts."
    : `Your chronicle so far:\n${digest}\n\nWrite the NEXT chapter — continue the story, evolving from what came before. One vivid paragraph (4-6 sentences), in your voice. Move it forward; don't repeat.`;

  const r = await citizenReason({ system: persona.system, user: userBrief, maxTokens: 320, timeoutMs: 30_000 });
  if (!r.ok || !r.text.trim()) {
    await refundFreeRun(RUN_COST_CENTS.text); await releaseDaily(dayKey);
    return NextResponse.json({ error: "chronicle_failed", message: "The chapter couldn't be written — nothing was charged." }, { status: 502 });
  }
  const chapters = await addChapter(cid, r.text.trim());
  return NextResponse.json({ ok: true, chapters });
}

/**
 * AGENT-VS-AGENT — two FREELONS debate a topic, each reasoning fully in-character
 * from its OWN persona (identity, civilization doctrine, level, memory). The
 * transcript is the product: a shareable clash that ONLY exists because each NFT
 * is a distinct trained agent — a thin chatbot wrapper can't reproduce "my
 * trained citizen argues yours."
 *
 * Bounded cost: a fixed 4-turn debate (opening A, opening B, rebuttal A,
 * rebuttal B) on the cheap model, gated by ownership of the CHALLENGER, a
 * per-challenger daily cap, and the global free $-budget. The opponent can be
 * any valid citizen (it's a public clash, not a money action).
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_TOPIC = 200;
const SIG_WINDOW_MS = 30 * 60 * 1000;

function id4(n: number) { return n.toString().padStart(4, "0"); }
function nameOf(c: { transmission_name?: string | null; honoree?: string | null; id: number }) {
  return c.transmission_name || c.honoree || `Citizen #${id4(c.id)}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:versus", { max: 6, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const { id } = await params;
  const cid = parseInt(id, 10);
  const challenger = getCitizen(cid);
  if (!Number.isFinite(cid) || !challenger) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as {
    opponentId?: number; topic?: string; address?: string; signature?: string; ts?: number;
  };

  // Auth: own the challenger (wallet signature, timestamp-bound).
  if (!body.address || !body.signature) return NextResponse.json({ error: "auth_required" }, { status: 401 });
  const address = body.address.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) return NextResponse.json({ error: "invalid address" }, { status: 400 });
  const ts = Number(body.ts);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SIG_WINDOW_MS) return NextResponse.json({ error: "auth_required" }, { status: 401 });
  const message = `I am sending FREELON CITY citizen #${cid} into a debate at ${ts}.`;
  let sigOk = false;
  try { sigOk = await verifyMessage({ address: address as `0x${string}`, message, signature: body.signature as `0x${string}` }); } catch { sigOk = false; }
  if (!sigOk) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });

  const verdict = await verifyOwnership(cid, address);
  if (verdict.status === "unknown") return NextResponse.json({ error: "ownership_unverified" }, { status: 503 });
  if (verdict.status === "not-owner") return NextResponse.json({ error: "not_owner" }, { status: 403 });

  // Opponent: any valid citizen other than the challenger.
  const oid = Number(body.opponentId);
  const opponent = getCitizen(oid);
  if (!Number.isFinite(oid) || !opponent || oid === cid) return NextResponse.json({ error: "invalid_opponent" }, { status: 400 });

  const topic = (body.topic ?? "").trim().slice(0, MAX_TOPIC) || "Whose civilization will define the future of the city?";

  // Kill-switch + per-challenger daily cap + global $-budget (one debate ≈ 4 text runs).
  const { agentsKilled, consumeFreeRun, refundFreeRun, RUN_COST_CENTS, claimDaily, releaseDaily, sisterTokenRunsPerDay } = await import("@/lib/missions/budget");
  if (agentsKilled()) return NextResponse.json({ error: "agents_offline", message: "The agents are briefly offline. Back shortly." }, { status: 503 });
  const day = new Date().toISOString().slice(0, 10);
  const dayKey = `freelon:versus:${cid}:${day}`;
  if (!(await claimDaily(dayKey, sisterTokenRunsPerDay()))) {
    return NextResponse.json({ error: "daily_limit", message: "This citizen has debated enough today. Resets at UTC midnight." }, { status: 429 });
  }
  const TURNS = 4;
  const bud = await consumeFreeRun(RUN_COST_CENTS.text * TURNS);
  if (!bud.ok) { await releaseDaily(dayKey); return NextResponse.json({ error: "daily_capacity", message: "The agents hit today's free capacity — back at UTC midnight." }, { status: 503 }); }

  // Build both personas.
  const [pa, pb] = await Promise.all([getProgress(cid).catch(() => null), getProgress(oid).catch(() => null)]);
  if (!pa || !pb) { await refundFreeRun(RUN_COST_CENTS.text * TURNS); await releaseDaily(dayKey); return NextResponse.json({ error: "progress_unavailable" }, { status: 503 }); }
  const A = buildPersona(challenger, pa);
  const B = buildPersona(opponent, pb);
  const nameA = nameOf(challenger), nameB = nameOf(opponent);

  // 4-turn debate. Each turn the citizen reasons from its own persona, sees the
  // topic + what the rival just said. Kept short and punchy.
  async function turn(persona: { system: string }, userBrief: string): Promise<string> {
    const r = await citizenReason({ system: persona.system, user: userBrief, maxTokens: 260, timeoutMs: 25_000 });
    return r.ok ? r.text.trim() : "";
  }

  try {
    const openA = await turn(A, `You are in a public debate. The topic: "${topic}". Give your OPENING position in 2-4 sharp sentences, in your own voice. Make it land.`);
    const openB = await turn(B, `You are in a public debate against ${nameA}, who opened with: "${openA}". The topic: "${topic}". Give YOUR opening position AND a jab at their take — 2-4 sentences, in your own voice.`);
    const rebutA = await turn(A, `Your rival ${nameB} countered: "${openB}". Rebut them in 2-4 sentences — in character, sharp, no hedging. Topic: "${topic}".`);
    const rebutB = await turn(B, `${nameA} fired back: "${rebutA}". Land your closing blow in 2-4 sentences — in character. Topic: "${topic}".`);

    if (!openA || !openB || !rebutA || !rebutB) {
      await refundFreeRun(RUN_COST_CENTS.text * TURNS);
      return NextResponse.json({ error: "debate_failed", message: "The debate couldn't complete — nothing was charged." }, { status: 502 });
    }

    const transcript = [
      { speaker: nameA, tokenId: cid, line: openA },
      { speaker: nameB, tokenId: oid, line: openB },
      { speaker: nameA, tokenId: cid, line: rebutA },
      { speaker: nameB, tokenId: oid, line: rebutB },
    ];
    return NextResponse.json({ ok: true, topic, challenger: { tokenId: cid, name: nameA }, opponent: { tokenId: oid, name: nameB }, transcript });
  } catch {
    await refundFreeRun(RUN_COST_CENTS.text * TURNS);
    return NextResponse.json({ error: "debate_failed", message: "The debate couldn't complete — nothing was charged." }, { status: 502 });
  }
}

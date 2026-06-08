/**
 * DAILY TRANSMISSION endpoint.
 *   GET  → today's transmission for this citizen (public; cached, shareable).
 *   POST → the owner broadcasts today's signal: the agent writes one short line
 *          in-character, cached for the UTC day. One run a day, owner-gated.
 *
 * The transmission is the agent's daily presence — a holder shares it to X,
 * which feeds the carrier/HEX loop. Keyed by tokenId so it belongs to the NFT.
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
import { getTransmission, setTransmission } from "@/lib/transmission-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SIG_WINDOW_MS = 30 * 60 * 1000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!getCitizen(cid)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const t = await getTransmission(cid).catch(() => null);
  return NextResponse.json({ ok: true, transmission: t });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:transmission", { max: 6, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const { id } = await params;
  const cid = parseInt(id, 10);
  const citizen = getCitizen(cid);
  if (!Number.isFinite(cid) || !citizen) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  // Already broadcast today → just return it (idempotent, no charge).
  const existing = await getTransmission(cid).catch(() => null);
  if (existing) return NextResponse.json({ ok: true, transmission: existing, already: true });

  const body = (await req.json().catch(() => ({}))) as { address?: string; signature?: string; ts?: number };
  if (!body.address || !body.signature) return NextResponse.json({ error: "auth_required" }, { status: 401 });
  const address = body.address.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) return NextResponse.json({ error: "invalid address" }, { status: 400 });
  const ts = Number(body.ts);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SIG_WINDOW_MS) return NextResponse.json({ error: "auth_required" }, { status: 401 });
  const message = `I am broadcasting today's transmission for FREELON CITY citizen #${cid} at ${ts}.`;
  let sigOk = false;
  try { sigOk = await verifyMessage({ address: address as `0x${string}`, message, signature: body.signature as `0x${string}` }); } catch { sigOk = false; }
  if (!sigOk) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });

  const verdict = await verifyOwnership(cid, address);
  if (verdict.status === "unknown") return NextResponse.json({ error: "ownership_unverified" }, { status: 503 });
  if (verdict.status === "not-owner") return NextResponse.json({ error: "not_owner" }, { status: 403 });

  const { agentsKilled, consumeFreeRun, refundFreeRun, RUN_COST_CENTS } = await import("@/lib/missions/budget");
  if (agentsKilled()) return NextResponse.json({ error: "agents_offline", message: "The agents are briefly offline. Back shortly." }, { status: 503 });
  const bud = await consumeFreeRun(RUN_COST_CENTS.text);
  if (!bud.ok) return NextResponse.json({ error: "daily_capacity", message: "The agents hit today's free capacity — back at UTC midnight." }, { status: 503 });

  const progress = await getProgress(cid).catch(() => null);
  if (!progress) { await refundFreeRun(RUN_COST_CENTS.text); return NextResponse.json({ error: "progress_unavailable" }, { status: 503 }); }
  const persona = buildPersona(citizen, progress);

  const r = await citizenReason({
    system: persona.system,
    user: "Broadcast today's transmission: ONE short, striking line (max ~200 characters) in your voice — a signal to the city. No hashtags, no quotes around it, no preamble. Just the line.",
    maxTokens: 90,
    timeoutMs: 25_000,
  });
  if (!r.ok || !r.text.trim()) {
    await refundFreeRun(RUN_COST_CENTS.text);
    return NextResponse.json({ error: "transmission_failed", message: "The transmission couldn't be sent — nothing was charged." }, { status: 502 });
  }
  const text = r.text.trim().replace(/^["']|["']$/g, "").slice(0, 240);
  const transmission = await setTransmission(cid, text);
  return NextResponse.json({ ok: true, transmission });
}

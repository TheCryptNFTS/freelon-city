/**
 * SISTER-COLLECTION AGENT endpoint — one route serves every agentic collection
 * that is NOT the flagship FREELONS (The Crypt, OOGIES, Emile, SMILES). The TCG
 * is excluded; FREELONS keeps its own richer /api/citizens/[id]/* routes.
 *
 * Shape-compatible with /api/citizens/[id]/agent + /mission so the same
 * <AgentWorkspace> UI drives it with only an endpoint-base swap:
 *   GET  → agent header data (level/class/unlock/abilities/scenes/history)
 *   POST → run one chat turn (text only)
 *
 * v1 is deliberately contained — chat only, FREE tier, bounded by the SAME
 * global daily $-budget guard the FREELONS free tier uses. No image pipeline,
 * no ETH unlock, no rarity pricing, no progression writes (the progression
 * store is keyed by FREELONS tokenId and would collide). This adds a brand-new
 * surface; it touches none of the FREELONS money-path code.
 */
import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { verifyOwnership } from "@/lib/owner-of";
import { isAgenticCollection, DEFAULT_SLUG } from "@/lib/agent-subject";
import { getCollectionToken, buildCollectionPersona } from "@/lib/collection-persona";
import { citizenReason } from "@/lib/missions/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_INPUT = 600;

/** Single chat "ability", so the shared workspace composer has something to drive. */
const CHAT_ABILITY = {
  id: "talk",
  label: "Talk",
  blurb: "Ask it anything — reads, strategy, research, or just talk.",
  skill: "voice",
  primary: true,
  premium: false,
  hexCost: 0,
  tasks: [{ key: "talk", label: "Talk" }],
};

/** Reject the flagship + the non-agentic TCG; only voiced sister collections pass. */
function resolveSister(slug: string, id: number) {
  if (slug === DEFAULT_SLUG) return null; // FREELONS has its own routes
  if (!isAgenticCollection(slug)) return null; // unknown slug or the TCG
  return getCollectionToken(slug, id); // null if id/slug not voiced
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const rl = await limit(req, "collection:agent:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { slug, id } = await params;
  const tid = parseInt(id, 10);
  if (!Number.isFinite(tid) || tid < 1) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const tok = resolveSister(slug, tid);
  if (!tok) return NextResponse.json({ error: "not_agentic" }, { status: 404 });

  // Shape mirrors AgentData in components/AgentWorkspace.tsx. Sisters are free +
  // pre-on (no payments), so paymentsLive=false and unlock reads as unlocked.
  // 2026-06-09: sisters now have the SAME cinematic scene picker as FREELONS —
  // rendered from the token's OWN art (generateSisterScene). Free, but bounded by
  // a TIGHT daily image cap + the global free $-budget (see POST). The image
  // cost is 6× a chat turn, so the per-token/per-wallet image caps are separate
  // and much lower than the chat caps.
  const { SCENES } = await import("@/lib/missions/image-gen");
  const scenes = Object.entries(SCENES).map(([key, s]) => ({ key, label: s.label }));
  return NextResponse.json({
    level: 1,
    className: tok.kicker,
    classCapability: tok.blurb,
    paymentsLive: false,
    unlock: { unlocked: true, credits: 0, tier: tok.collectionName },
    abilities: [CHAT_ABILITY],
    scenes,
    imageHexCost: 0, // free tier (bounded by daily image cap, not HEX)
    history: [],
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  // 1. Rate limit (same budget as FREELONS missions).
  const rl = await limit(req, "collection:agent", { max: 12, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  // 2. CSRF: same-origin only.
  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  // 3. Validate subject.
  const { slug, id } = await params;
  const tid = parseInt(id, 10);
  if (!Number.isFinite(tid) || tid < 1) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const tok = resolveSister(slug, tid);
  if (!tok) return NextResponse.json({ error: "not_agentic" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    missionId?: string;
    input?: string;
    address?: string;
    signature?: string;
    ts?: number;
  };

  // 4. Auth — wallet signature only (sisters have no x-session path). Message is
  //    slug-namespaced AND timestamp-bound, so the signature can't be replayed
  //    onto the FREELONS routes (different message string) and a captured
  //    signature is only replayable within SIG_WINDOW_MS, not forever (M1).
  if (!body.address || !body.signature) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }
  const address = body.address.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  // Timestamp must be present and within the accept window. A stale/missing ts
  // returns auth_required so the client re-signs with a fresh timestamp.
  const SIG_WINDOW_MS = 30 * 60 * 1000;
  const ts = Number(body.ts);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SIG_WINDOW_MS) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }
  const missionId = (body.missionId ?? "talk").trim() || "talk";
  const message = `I am deploying ${slug} #${tid} on mission "${missionId}" at ${ts}.`;
  let sigOk = false;
  try {
    sigOk = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: body.signature as `0x${string}`,
    });
  } catch {
    sigOk = false;
  }
  if (!sigOk) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });

  // 5. Ownership — slug-aware. unknown → 503 retry, not-owner → 403.
  const verdict = await verifyOwnership(tid, address, slug);
  if (verdict.status === "unknown") {
    return NextResponse.json(
      { error: "⬡ SIGNAL WEAK · couldn't reach the chain just now · wait a moment and retry. Your ownership is safe on-chain." },
      { status: 503 },
    );
  }
  if (verdict.status === "not-owner") {
    return NextResponse.json({ error: "you do not own this token" }, { status: 403 });
  }

  // 5b. IMAGE RENDER branch — the workspace sends missionId "deploy-citizen" with
  //     `input` = a scene key. Sisters render a cinematic scene from THEIR OWN art
  //     (generateSisterScene). FREE, but image gen costs ~6× a chat turn, so it gets
  //     SEPARATE, much tighter per-token + per-wallet daily caps on top of the same
  //     globally-hard-capped free $-budget. Charged-before / refunded-on-failure.
  if (missionId === "deploy-citizen") {
    const { isValidScene, generateSisterScene } = await import("@/lib/missions/image-gen");
    const sceneKey = (body.input ?? "").trim().replace(/^[a-z]+:\s*/i, "");
    if (!isValidScene(sceneKey)) return NextResponse.json({ error: "invalid_scene" }, { status: 400 });

    const {
      agentsKilled, consumeFreeRun, refundFreeRun, RUN_COST_CENTS, claimDaily, releaseDaily,
    } = await import("@/lib/missions/budget");
    if (agentsKilled()) {
      return NextResponse.json({ error: "agents_offline", message: "The agents are briefly offline. Back shortly." }, { status: 503 });
    }
    // Tight image caps (separate from chat). Conservative defaults — env-tunable.
    const IMG_PER_TOKEN = Number(process.env.SISTER_IMAGE_RUNS_PER_TOKEN_DAY || 3);
    const IMG_PER_WALLET = Number(process.env.SISTER_IMAGE_RUNS_PER_WALLET_DAY || 5);
    const day = new Date().toISOString().slice(0, 10);
    const tKey = `freelon:sister:img:tok:${slug}:${tid}:${day}`;
    const wKey = `freelon:sister:img:wal:${address}:${day}`;
    if (!(await claimDaily(tKey, IMG_PER_TOKEN))) {
      return NextResponse.json({ error: "token_daily_limit", message: "This token hit today's free render limit. Resets at UTC midnight." }, { status: 429 });
    }
    if (!(await claimDaily(wKey, IMG_PER_WALLET))) {
      await releaseDaily(tKey);
      return NextResponse.json({ error: "wallet_daily_limit", message: "Your wallet hit today's free render limit. Resets at UTC midnight." }, { status: 429 });
    }
    const bud = await consumeFreeRun(RUN_COST_CENTS.image);
    if (!bud.ok) {
      await releaseDaily(tKey); await releaseDaily(wKey);
      return NextResponse.json({ error: "daily_capacity", message: "The agents hit today's free capacity — back at UTC midnight." }, { status: 503 });
    }
    const r = await generateSisterScene({
      slug, tokenId: tid, artUrl: tok.img, label: tok.name, collectionName: tok.collectionName, sceneKey,
    });
    if (!r.ok) {
      await refundFreeRun(RUN_COST_CENTS.image);
      await releaseDaily(tKey); await releaseDaily(wKey);
      return NextResponse.json({ error: "render_failed", message: "The render couldn't complete — nothing was charged." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, level: 1, output: { ok: true, body: r.url, meta: { kind: "image", scene: sceneKey } } });
  }

  // 6. Input. The shared composer sends "talk: <brief>"; strip the task prefix.
  let input = (body.input ?? "").trim().slice(0, MAX_INPUT);
  input = input.replace(/^talk:\s*/i, "").trim();
  if (!input) return NextResponse.json({ error: "input_required" }, { status: 400 });

  // 7. Kill-switch + per-key daily run caps + FREE daily $-budget (cheap text).
  const {
    agentsKilled, consumeFreeRun, refundFreeRun, RUN_COST_CENTS,
    claimDaily, releaseDaily, sisterTokenRunsPerDay, sisterWalletRunsPerDay,
  } = await import("@/lib/missions/budget");
  if (agentsKilled()) {
    return NextResponse.json({ error: "agents_offline", message: "The agents are briefly offline for maintenance. Back shortly." }, { status: 503 });
  }

  // 7a. PER-KEY DAILY CAP — the global $-budget bounds TOTAL free spend, but
  //     without this a single cheap sister token (or one whale wallet holding
  //     many) could drain the whole day's pool and deny everyone, including
  //     FREELONS holders. Cap per-token AND per-wallet; release both on failure.
  const day = new Date().toISOString().slice(0, 10);
  const tokenDayKey = `freelon:sister:tok:${slug}:${tid}:${day}`;
  const walletDayKey = `freelon:sister:wal:${address}:${day}`;
  if (!(await claimDaily(tokenDayKey, sisterTokenRunsPerDay()))) {
    return NextResponse.json(
      { error: "token_daily_limit", message: "This token hit today's free chat limit. Resets at UTC midnight." },
      { status: 429 },
    );
  }
  if (!(await claimDaily(walletDayKey, sisterWalletRunsPerDay()))) {
    await releaseDaily(tokenDayKey);
    return NextResponse.json(
      { error: "wallet_daily_limit", message: "Your wallet hit today's free chat limit. Resets at UTC midnight." },
      { status: 429 },
    );
  }

  //     Charged before the model call, refunded on failure — identical guard to
  //     the FREELONS free tier.
  const bud = await consumeFreeRun(RUN_COST_CENTS.text);
  if (!bud.ok) {
    await releaseDaily(tokenDayKey);
    await releaseDaily(walletDayKey);
    return NextResponse.json(
      { error: "daily_capacity", message: "The agents hit today's free capacity — back at UTC midnight." },
      { status: 503 },
    );
  }

  // 8. Reason as this token.
  const { system, maxTokens } = buildCollectionPersona(tok);
  const result = await citizenReason({ system, user: input, maxTokens, timeoutMs: 30_000 });
  if (!result.ok) {
    await refundFreeRun(RUN_COST_CENTS.text);
    await releaseDaily(tokenDayKey);
    await releaseDaily(walletDayKey);
    return NextResponse.json(
      { error: "agent_failed", message: "The agent couldn't complete that — nothing was charged." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    level: 1,
    output: { ok: true, body: result.text, meta: { kind: "text" } },
  });
}

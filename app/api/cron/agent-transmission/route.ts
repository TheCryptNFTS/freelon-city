/**
 * Vercel cron — the FLAGSHIP FREELON's public voice.
 *
 * Once a day, ONE flagship citizen authors a short in-character transmission and
 * posts it to @freeloncity. This gives the collection a public face (the aixbt
 * lesson: one agent, useful + loud in public, IS the marketing) using the same
 * reasoning core that powers owned agents — so it's genuinely THIS citizen
 * speaking, not a template.
 *
 * Reuses: buildPersona + citizenReason (the agent brain), the daily transmission
 * cache (idempotent one-per-UTC-day), agent-history (the post becomes part of the
 * flagship's body of work), and the shared X poster.
 *
 * Required env:
 *   CRON_SECRET              — Bearer auth for the cron (fail-closed).
 *   FLAGSHIP_TOKEN_ID        — which citizen is the public voice. Unset → dry-run.
 *   AGENT_X_POSTING_LIVE     — "true" to actually post. Anything else → dry-run
 *                              (reasons + caches the line, never hits X). Default off.
 *   X_API_KEY/SECRET, X_ACCESS_TOKEN/SECRET — posting creds (see lib/x-post).
 */
import { NextResponse } from "next/server";
import { getCitizen } from "@/lib/citizens";
import { getProgress } from "@/lib/progression-store";
import { buildPersona } from "@/lib/missions/persona";
import { citizenReason } from "@/lib/missions/llm";
import { getTransmission, setTransmission } from "@/lib/transmission-store";
import { addAgentWork } from "@/lib/agent-history";
import { postTweet, hasXCredentials } from "@/lib/x-post";
import { MODELS } from "@/lib/missions/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FOOTER = "freeloncity.com";
const MAX_LINE = 240; // leaves room under X's 280 for the footer line

export async function GET(req: Request) {
  // Fail closed in ALL environments — an unauthenticated cron endpoint that can
  // post to X is a spam vector. No secret set → refuse.
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron_unconfigured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const flagshipId = parseInt(process.env.FLAGSHIP_TOKEN_ID || "", 10);
  if (!Number.isFinite(flagshipId)) {
    return NextResponse.json({ mode: "dry-run", reason: "FLAGSHIP_TOKEN_ID not set" });
  }
  const citizen = getCitizen(flagshipId);
  if (!citizen) {
    return NextResponse.json({ mode: "error", reason: "flagship_invalid_id" }, { status: 400 });
  }

  // Idempotent: one transmission per UTC day. If we already authored today's, do
  // NOT re-reason or re-post — return what's cached. (Cron can fire more than once.)
  const existing = await getTransmission(flagshipId).catch(() => null);
  if (existing) {
    return NextResponse.json({ mode: "already", transmission: existing });
  }

  const progress = await getProgress(flagshipId).catch(() => null);
  if (!progress) return NextResponse.json({ mode: "error", reason: "progress_unavailable" }, { status: 503 });

  const persona = buildPersona(citizen, progress);
  const r = await citizenReason({
    system: persona.system,
    user:
      "Post today's public transmission to the city — ONE striking line, under 220 characters, in your own voice. " +
      "It is read by strangers on X, so make it land on its own with no context. No hashtags, no @handles, no quotes, no preamble. Just the line.",
    maxTokens: 90,
    model: MODELS.cheap,
    timeoutMs: 25_000,
  });
  if (!r.ok || !r.text.trim()) {
    return NextResponse.json({ mode: "error", reason: "reason_failed" }, { status: 502 });
  }

  const line = r.text.trim().replace(/^["']|["']$/g, "").slice(0, MAX_LINE);
  const tweet = `${line}\n\n${FOOTER}`;

  // Cache FIRST so the day is claimed even if posting fails — prevents a retry
  // from re-reasoning a different line and double-posting.
  const transmission = await setTransmission(flagshipId, line);
  await addAgentWork(flagshipId, {
    ability: "voice",
    abilityLabel: "Transmission",
    task: "broadcast",
    brief: "Daily public transmission to the city",
    kind: "text",
    body: line,
    level: progress.level,
  }).catch(() => {});

  const live = process.env.AGENT_X_POSTING_LIVE === "true";
  if (!live || !hasXCredentials()) {
    return NextResponse.json({
      mode: "dry-run",
      reason: live ? "X credentials not set" : "AGENT_X_POSTING_LIVE not true",
      would_post: tweet,
      transmission,
    });
  }

  try {
    const response = await postTweet(tweet);
    return NextResponse.json({ mode: "posted", tweet, transmission, response });
  } catch (e) {
    console.error("[cron/agent-transmission] postTweet failed", e);
    // The line is already cached; we just didn't post. Surface error, no retry-storm.
    return NextResponse.json({ mode: "error", reason: "post_failed", transmission }, { status: 500 });
  }
}

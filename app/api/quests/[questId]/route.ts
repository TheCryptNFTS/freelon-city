import { NextResponse } from "next/server";
import { markStep, getQuests, QUEST_REWARDS, QUEST_TARGETS, type QuestId } from "@/lib/quests-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { isSameOrigin, requireProvenWallet, verifySession, X_SESSION_COOKIE } from "@/lib/x-session";

export const dynamic = "force-dynamic";

const VALID_QUESTS: QuestId[] = ["city-tourist", "archivist", "hex-hunter", "doctrine-master"];

function isValidQuest(q: string): q is QuestId {
  return (VALID_QUESTS as string[]).includes(q);
}

function normalizeKey(raw: string): string | null {
  const v = (raw || "").trim().toLowerCase();
  if (!v || v.length > 80) return null;
  if (/^0x[a-f0-9]{40}$/.test(v)) return v;
  if (/^[a-z0-9_]{1,32}$/.test(v)) return `handle:${v}`;
  return null;
}

// POST { key, stepId }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ questId: string }> },
) {
  const rl = await limit(req, "quest:post", { max: 40, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  // CSRF: only accept same-origin browser POSTs.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  const { questId } = await params;
  if (!isValidQuest(questId)) {
    return NextResponse.json({ error: "unknown_quest" }, { status: 400 });
  }

  let body: { key?: string; stepId?: string } = {};
  try {
    body = (await req.json()) as { key?: string; stepId?: string };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const key = normalizeKey(body.key ?? "");
  const stepId = (body.stepId ?? "").trim().slice(0, 64);
  if (!key) return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  if (!stepId) return NextResponse.json({ error: "missing_stepId" }, { status: 400 });

  // Auth: require an X session that matches the key being mutated.
  //   - wallet key (0x…): require a PROVEN wallet — quest completion credits
  //     real ⬡ to this key (lib/quests-store.ts markStep), and `bind` is
  //     attacker-chooseable at OAuth start, so bind-auth let one X account
  //     farm quest rewards into arbitrary wallets (capped, but a rule-5
  //     violation). Upgraded bind→proof 2026-06-10.
  //   - handle key (handle:…): require session whose xHandle matches
  //     (handle keys credit nothing — progress tracking only).
  // Previously: no auth — anyone could POST quest progress for any
  // wallet or handle (rate-limit was the only gate).
  if (/^0x[a-f0-9]{40}$/.test(key)) {
    if (!requireProvenWallet(req, key)) {
      return NextResponse.json({ error: "wallet_proof_required" }, { status: 401 });
    }
  } else if (key.startsWith("handle:")) {
    const cookieHeader = req.headers.get("cookie") || "";
    const m = cookieHeader.match(new RegExp(`(?:^|; )${X_SESSION_COOKIE}=([^;]+)`));
    const session = m ? verifySession(decodeURIComponent(m[1])) : null;
    const claimedHandle = key.slice("handle:".length);
    if (!session || (session.xHandle || "").toLowerCase() !== claimedHandle) {
      return NextResponse.json({ error: "session_required" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }

  const result = await markStep(key, questId, stepId);
  return NextResponse.json({
    questId,
    progress: result.progress,
    target: result.target,
    justCompleted: result.justCompleted,
    rewardHex: result.reward,
  });
}

// GET ?key=<addr|handle>
export async function GET(
  req: Request,
  { params }: { params: Promise<{ questId: string }> },
) {
  const { questId } = await params;
  if (!isValidQuest(questId)) {
    return NextResponse.json({ error: "unknown_quest" }, { status: 400 });
  }
  const url = new URL(req.url);
  const key = normalizeKey(url.searchParams.get("key") ?? "");
  if (!key) return NextResponse.json({ error: "invalid_key" }, { status: 400 });

  const state = await getQuests(key);
  const target = QUEST_TARGETS[questId];
  const completed = state.completed.includes(questId);
  const progress = completed ? target : (state.progress[questId]?.length ?? 0);
  return NextResponse.json({
    questId,
    progress,
    target,
    completed,
    rewardHex: QUEST_REWARDS[questId],
  });
}

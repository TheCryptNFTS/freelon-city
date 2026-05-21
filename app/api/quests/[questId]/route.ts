import { NextResponse } from "next/server";
import { markStep, getQuests, QUEST_REWARDS, QUEST_TARGETS, type QuestId } from "@/lib/quests-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";

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

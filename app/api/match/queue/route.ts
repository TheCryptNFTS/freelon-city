import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { upstash, hasUpstash } from "@/lib/upstash-client";
import { withLock } from "@/lib/upstash-lock";
import { createMatch as persistMatch } from "@/lib/match-store";
import { redactStateFor } from "@/lib/redact-state";
import { buildMatchRecord } from "@/lib/match-pvp";
import { verifyBearer } from "@/lib/game-session";
import { gameCorsHeaders, gameOptions } from "@/lib/game-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/match/queue  (Bearer)
 *   -> 200 { status: "waiting" }
 *   -> 200 { status: "matched", matchId, mySeat, version, view }
 *   -> 202 { status: "retry" }
 *
 * Public matchmaking. A single global waiter slot holds the first arrival; the
 * next DISTINCT wallet that polls is paired with the waiter into a fresh match
 * (waiter = P1, caller = P2). Wrapped in `withLock` so two simultaneous polls
 * can't both claim the same waiter. Lock contention -> 202 retry.
 *
 * Cross-origin (game SPA): CORS allow-list, never `*`.
 */

const SLOT_KEY = "freelon:match:queue:v1";
const SLOT_TTL_SEC = 60;

type Waiter = { addr: string; ts: number };

// Dev fallback when Upstash isn't configured.
const memorySlot = { value: null as null | { waiter: Waiter; expiresAt: number } };

async function readSlot(): Promise<Waiter | null> {
  if (!hasUpstash) {
    const s = memorySlot.value;
    if (!s) return null;
    if (s.expiresAt < Date.now()) {
      memorySlot.value = null;
      return null;
    }
    return s.waiter;
  }
  const raw = (await upstash(["GET", SLOT_KEY])) as string | null;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Waiter;
  } catch {
    return null;
  }
}

async function writeSlot(w: Waiter): Promise<void> {
  if (!hasUpstash) {
    memorySlot.value = { waiter: w, expiresAt: Date.now() + SLOT_TTL_SEC * 1000 };
    return;
  }
  await upstash(["SET", SLOT_KEY, JSON.stringify(w), "EX", String(SLOT_TTL_SEC)]);
}

async function clearSlot(): Promise<void> {
  if (!hasUpstash) {
    memorySlot.value = null;
    return;
  }
  await upstash(["DEL", SLOT_KEY]);
}

export async function OPTIONS(req: Request) {
  return gameOptions(req);
}

export async function POST(req: Request) {
  const cors = gameCorsHeaders(req);
  const rl = await limit(req, "match-queue", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl, cors);

  const session = await verifyBearer(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }
  const addr = session.address;

  const result = await withLock("match:queue", 5, async () => {
    const waiter = await readSlot();

    // Empty slot -> become the waiter.
    if (!waiter) {
      await writeSlot({ addr, ts: Date.now() });
      return { kind: "waiting" as const };
    }

    // Same wallet already waiting -> keep waiting (refresh TTL).
    if (waiter.addr.toLowerCase() === addr.toLowerCase()) {
      await writeSlot({ addr, ts: Date.now() });
      return { kind: "waiting" as const };
    }

    // A DIFFERENT wallet is waiting -> pair them. waiter = P1, caller = P2.
    await clearSlot();
    const record = buildMatchRecord(waiter.addr, addr);
    const stored = await persistMatch(record);
    return { kind: "matched" as const, record: stored };
  });

  // Lock contention: another poll holds the queue lock right now.
  if (result === null) {
    return NextResponse.json({ status: "retry" }, { status: 202, headers: cors });
  }

  if (result.kind === "waiting") {
    return NextResponse.json({ status: "waiting" }, { headers: cors });
  }

  const stored = result.record;
  return NextResponse.json(
    {
      status: "matched",
      matchId: stored.matchId,
      mySeat: "P2",
      version: stored.version,
      view: redactStateFor("P2", stored.state, {
        matchId: stored.matchId,
        joinCode: stored.joinCode,
      }),
    },
    { headers: cors },
  );
}

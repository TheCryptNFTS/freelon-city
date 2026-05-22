import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { creditWalletHex } from "@/lib/wallet-hex-store";
import { getDailyMission, utcDayKey } from "@/lib/daily-mission";
import { ECONOMY } from "@/lib/economy-constants";

export const dynamic = "force-dynamic";

const MISSION_REWARD = ECONOMY.MISSION_REWARD;
const TTL_SECONDS = 48 * 60 * 60; // 48h
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

// Local in-memory fallback when Upstash is not configured (dev).
const memory = new Map<string, number>(); // key -> expires at ms

async function upstash(cmd: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const j = (await res.json()) as { result: unknown };
  return j.result;
}

function normalizeKey(raw: string): string | null {
  const v = (raw || "").trim().toLowerCase();
  if (!v || v.length > 80) return null;
  if (/^0x[a-f0-9]{40}$/.test(v)) return v; // wallet
  if (v.startsWith("handle:")) {
    const h = v.slice(7);
    if (/^[a-z0-9_]{1,32}$/.test(h)) return v;
    return null;
  }
  if (/^[a-z0-9_]{1,32}$/.test(v)) return `handle:${v}`;
  return null;
}

async function alreadyClaimed(storageKey: string): Promise<boolean> {
  if (hasUpstash) {
    try {
      const r = (await upstash(["GET", storageKey])) as string | null;
      return !!r;
    } catch {
      // fall through to memory
    }
  }
  const exp = memory.get(storageKey);
  if (exp && exp > Date.now()) return true;
  if (exp) memory.delete(storageKey);
  return false;
}

async function markClaimed(storageKey: string): Promise<void> {
  if (hasUpstash) {
    try {
      await upstash(["SET", storageKey, "1", "EX", String(TTL_SECONDS)]);
      return;
    } catch {
      // fall through
    }
  }
  memory.set(storageKey, Date.now() + TTL_SECONDS * 1000);
}

// POST { key, missionId }
export async function POST(req: Request) {
  const rl = await limit(req, "mission:claim", { max: 20, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  // CSRF: same-origin only
  const { isSameOrigin, requireSessionBound, getSessionFromRequest } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { key?: string; missionId?: string } = {};
  try {
    body = (await req.json()) as { key?: string; missionId?: string };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const key = normalizeKey(body.key ?? "");
  if (!key) return NextResponse.json({ error: "invalid_key" }, { status: 400 });

  // Auth gate: if the key is a wallet, require an HMAC X-session bound
  // to that wallet. If it's a handle, require a session bound to that
  // handle. Without this, anyone could claim missions for any wallet/handle.
  const isWallet = /^0x[a-f0-9]{40}$/.test(key);
  if (isWallet) {
    if (!requireSessionBound(req, key)) {
      return NextResponse.json({ error: "session_required" }, { status: 401 });
    }
  } else {
    // Handle path: session must exist and its xHandle must match (case-insensitive)
    const s = getSessionFromRequest(req);
    if (!s || (s.xHandle || "").toLowerCase() !== key.toLowerCase()) {
      return NextResponse.json({ error: "session_required" }, { status: 401 });
    }
  }

  const today = getDailyMission(new Date());
  const requestedId = (body.missionId ?? "").trim().slice(0, 64);
  if (!requestedId || requestedId !== today.id) {
    return NextResponse.json({ error: "wrong_mission" }, { status: 400 });
  }

  const day = utcDayKey();
  const storageKey = `freelon:mission:claimed:${key}:${requestedId}:${day}`;

  if (await alreadyClaimed(storageKey)) {
    return NextResponse.json({ already: true, rewardHex: 0 });
  }

  await markClaimed(storageKey);

  // Only credit hex if the key is a wallet address. Handle-keyed callers
  // get the claim recorded but no ledger credit (matches quests-store pattern).
  let credited = false;
  if (/^0x[a-f0-9]{40}$/.test(key)) {
    try {
      await creditWalletHex(key, MISSION_REWARD, {
        kind: "quest",
        note: `Daily mission: ${requestedId} (+${MISSION_REWARD}⬡)`,
      });
      credited = true;
    } catch {
      /* non-fatal */
    }
  }

  return NextResponse.json({
    ok: true,
    rewardHex: MISSION_REWARD,
    credited,
    missionId: requestedId,
    day,
  });
}

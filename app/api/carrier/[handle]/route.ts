import { NextResponse } from "next/server";
import { getCarrier, putCarrier } from "@/lib/carrier-store";
import { syncHandle, normalizeHandle } from "@/lib/sync";
import { CarrierState } from "@/lib/carrier";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { requireXSession } from "@/lib/require-x";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dayKey(d = new Date()) {
  return Math.floor(d.getTime() / 86400000);
}

function tickDecay(s: CarrierState): CarrierState {
  const today = dayKey();
  const days = today - s.lastActiveDay;
  if (days <= 0) return s;
  return {
    ...s,
    rank: Math.max(0, s.rank - days * 4),
    streak: days > 1 ? 0 : s.streak,
    lastActiveDay: today,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const h = normalizeHandle(handle);
  if (!h) return NextResponse.json({ error: "invalid handle" }, { status: 400 });
  let state = await getCarrier(h);
  if (!state) {
    return NextResponse.json({ exists: false, handle: h });
  }
  const decayed = tickDecay(state);
  if (decayed !== state) await putCarrier(decayed);
  return NextResponse.json({ exists: true, state: decayed });
}

export async function POST(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const rl = await limit(req, "carrier-post", { max: 20 });
  if (!rl.ok) return tooManyResponse(rl);
  const { handle } = await params;
  const h = normalizeHandle(handle);
  if (!h) return NextResponse.json({ error: "invalid handle" }, { status: 400 });
  // Require verified X session bound to this handle (mutations only)
  const session = await requireXSession(req, { handle: h });
  if (session instanceof NextResponse) return session;
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const today = dayKey();

  const existing = await getCarrier(h);
  let cur: CarrierState;
  if (!existing) {
    const s = syncHandle(h);
    cur = {
      handle: h,
      civilization: s.civilization,
      rank: 20,
      streak: 1,
      lastActiveDay: today,
      totalRelays: 0,
      hexPoints: 50,
      totalEarned: 50,
      totalSpent: 0,
    };
  } else {
    cur = tickDecay(existing);
    // Backfill hex point fields for older records
    if (cur.hexPoints === undefined) {
      cur = { ...cur, hexPoints: 50, totalEarned: 50, totalSpent: 0 };
    }
  }

  if (body.action === "relay") {
    const sameDay = cur.lastActiveDay === today;
    const newStreak = sameDay ? cur.streak : cur.streak + 1;
    let earned = 10;
    if (!sameDay) {
      if (newStreak === 3) earned += 5;
      else if (newStreak === 7) earned += 10;
      else if (newStreak === 30) earned += 25;
    }
    const wasBearer = cur.rank >= 80;
    const willBeBearer = Math.min(100, cur.rank + 12) >= 80;
    if (!wasBearer && willBeBearer) earned += 50;

    cur = {
      ...cur,
      rank: Math.min(100, cur.rank + 12),
      streak: newStreak,
      lastActiveDay: today,
      totalRelays: cur.totalRelays + 1,
      hexPoints: cur.hexPoints + earned,
      totalEarned: cur.totalEarned + earned,
    };
  }

  await putCarrier(cur);
  return NextResponse.json({ exists: true, state: cur });
}

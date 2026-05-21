import { NextResponse } from "next/server";
import { getCarrier, putCarrier } from "@/lib/carrier-store";
import { hasUnlocked, unlock, isCitizenGifted } from "@/lib/unlock-store";
import { unlockCost } from "@/lib/deep-lore";
import { normalizeHandle, syncHandle } from "@/lib/sync";
import { getCitizen } from "@/lib/citizens";
import { COST, CarrierState, POINTS } from "@/lib/carrier";

function dayKey() { return Math.floor(Date.now() / 86400000); }

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  /** "self" = unlock for self, "gift" = unlock and gift to recipient */
  action: "self" | "gift";
  /** carrier handle */
  handle: string;
  /** recipient handle (for gift action) */
  recipient?: string;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = parseInt(id, 10);
  const url = new URL(_req.url);
  const handle = normalizeHandle(url.searchParams.get("h") ?? "");
  if (!handle) return NextResponse.json({ unlocked: false });
  const unlocked = await hasUnlocked(handle, cid);
  const gift = await isCitizenGifted(cid);
  return NextResponse.json({ unlocked, gift });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = parseInt(id, 10);
  const citizen = getCitizen(cid);
  if (!citizen) return NextResponse.json({ error: "citizen not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const action = body.action;
  const handle = normalizeHandle(body.handle ?? "");
  const recipient = body.recipient ? normalizeHandle(body.recipient) : null;

  if (!handle) return NextResponse.json({ error: "carrier handle required" }, { status: 400 });
  if (action === "gift" && !recipient) return NextResponse.json({ error: "recipient required for gift" }, { status: 400 });

  let carrier = await getCarrier(handle);
  if (!carrier) {
    // Lazily initialize so the unlock flow doesn't require a separate /carrier visit
    const s = syncHandle(handle);
    carrier = {
      handle,
      civilization: s.civilization,
      rank: 20,
      streak: 1,
      lastActiveDay: dayKey(),
      totalRelays: 0,
      hexPoints: POINTS.STARTING,
      totalEarned: POINTS.STARTING,
      totalSpent: 0,
    };
    await putCarrier(carrier);
  }

  const cost = action === "gift" ? COST.GIFT_UNLOCK : unlockCost(cid);
  if (carrier.hexPoints < cost) {
    return NextResponse.json({ error: "insufficient hex points", required: cost, have: carrier.hexPoints }, { status: 402 });
  }

  // Deduct points
  const next: CarrierState = {
    ...carrier,
    hexPoints: carrier.hexPoints - cost,
    totalSpent: carrier.totalSpent + cost,
  };
  await putCarrier(next);

  // Record unlock
  if (action === "self") {
    await unlock(handle, cid);
  } else if (action === "gift") {
    await unlock(recipient!, cid, handle);
  }

  return NextResponse.json({ ok: true, state: next, cost, action, citizenId: cid, recipient });
}

import { NextResponse } from "next/server";
import { getCarrier, putCarrier } from "@/lib/carrier-store";
import { addOwned, getGlobalSold, getOwned, incrementSold } from "@/lib/shop-store";
import { getItem } from "@/lib/shop";
import { normalizeHandle, syncHandle } from "@/lib/sync";
import { CarrierState, POINTS } from "@/lib/carrier";
import { limit, tooManyResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dayKey() {
  return Math.floor(Date.now() / 86400000);
}

type Body = {
  handle?: string;
  itemId?: string;
};

export async function POST(req: Request) {
  const rl = await limit(req, "shop-buy", { max: 10 });
  if (!rl.ok) return tooManyResponse(rl);

  const body = (await req.json().catch(() => ({}))) as Body;
  const handle = normalizeHandle(body.handle ?? "");
  const itemId = (body.itemId ?? "").trim();

  if (!handle) {
    return NextResponse.json({ error: "carrier handle required" }, { status: 400 });
  }
  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  const item = getItem(itemId);
  if (!item) {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }

  // Load or lazily initialize the carrier
  let carrier = await getCarrier(handle);
  if (!carrier) {
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

  // Affordability
  if (carrier.hexPoints < item.cost) {
    return NextResponse.json(
      { error: "insufficient hex points", required: item.cost, have: carrier.hexPoints },
      { status: 402 },
    );
  }

  // Supply check (limited items only)
  if (item.supply !== null && item.supply !== undefined) {
    const sold = await getGlobalSold(item.id);
    if (sold >= item.supply) {
      return NextResponse.json({ error: "sold out", supply: item.supply, sold }, { status: 409 });
    }
  }

  // Already-owned check (idempotent)
  const owned = await getOwned(handle);
  if (owned.includes(item.id)) {
    return NextResponse.json({ error: "already owned", state: carrier }, { status: 409 });
  }

  // Deduct, record
  const next: CarrierState = {
    ...carrier,
    hexPoints: carrier.hexPoints - item.cost,
    totalSpent: carrier.totalSpent + item.cost,
  };
  await putCarrier(next);
  await addOwned(handle, item.id);
  await incrementSold(item.id);

  const sold = await getGlobalSold(item.id);
  return NextResponse.json({
    ok: true,
    state: next,
    item,
    sold,
  });
}

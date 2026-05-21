import { NextResponse } from "next/server";
import { canClaimToday, getLastClaim, setLastClaim, todayUTC } from "@/lib/daily-claim-store";
import { isValidAddress } from "@/lib/wallet-tokens";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const addr = url.searchParams.get("addr") || "";
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  const last = await getLastClaim(addr);
  return NextResponse.json({
    today: todayUTC(),
    last,
    canClaim: last !== todayUTC(),
  });
}

export async function POST(req: Request) {
  let body: { addr?: string } = {};
  try {
    body = (await req.json()) as { addr?: string };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const addr = body.addr || "";
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!(await canClaimToday(addr))) {
    return NextResponse.json(
      { error: "already_claimed", today: todayUTC() },
      { status: 409 },
    );
  }
  await setLastClaim(addr, todayUTC());
  return NextResponse.json({
    ok: true,
    day: todayUTC(),
    awarded: 10,
  });
}

/**
 * /api/defender — RETIRED 2026-06-19.
 *
 * Was the "Synthesis / hold-the-floor" bid-wall: holders submitted above-floor
 * OpenSea bids for HEX rewards + a "SIGNAL BEARER" badge — a coordinated
 * floor-support campaign. Removed. GET returns empty stats; POST is 410 Gone.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ totalBids: 0, hexAwarded: 0, defenders: [] });
}

export async function POST() {
  return NextResponse.json(
    { error: "gone", message: "The defender bid-wall has been retired." },
    { status: 410 },
  );
}

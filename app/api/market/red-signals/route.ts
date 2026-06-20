/**
 * /api/market/red-signals — RETIRED 2026-06-19.
 *
 * Was the "below-floor bounty board": it flagged listings priced under the floor
 * and paid HEX to buy + hold them, and it wrote those flags to the red-signal
 * store (which drove "snipe this" alerts). Removed as floor-support / price
 * framing — all the public surfaces (dashboard feed, /earn section, city ticker)
 * are gone. Returns an empty set so any lingering caller is a harmless no-op.
 */
import { NextResponse } from "next/server";

export const revalidate = 300;

export async function GET() {
  return NextResponse.json({ signals: [] });
}

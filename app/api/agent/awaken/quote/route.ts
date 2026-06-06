import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RETIRED 2026-06-06. The flat-tier "awaken" payment was a parallel ETH
 * activation that did NOT grant premium access — the canonical activation is the
 * rarity-priced UNLOCK (app/api/citizens/[id]/unlock), which the agent dashboard
 * drives. "Awaken" is now just the narrative face of that unlock, not a separate
 * payment. This endpoint is disabled so no one can pay a path that doesn't
 * activate the agent.
 */
export async function POST() {
  return NextResponse.json(
    { error: "gone", message: "Awakening is now part of unlock — activate from the agent dashboard." },
    { status: 410 },
  );
}

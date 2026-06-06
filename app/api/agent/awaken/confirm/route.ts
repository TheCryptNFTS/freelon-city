import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RETIRED 2026-06-06. See quote/route.ts — the canonical activation is the
 * rarity-priced UNLOCK (app/api/citizens/[id]/unlock), driven by the agent
 * dashboard. This flat-tier awaken confirm is disabled so no payment can settle
 * against a path that doesn't grant premium access.
 */
export async function POST() {
  return NextResponse.json(
    { error: "gone", message: "Awakening is now part of unlock — activate from the agent dashboard." },
    { status: 410 },
  );
}

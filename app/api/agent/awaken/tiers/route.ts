import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { AWAKEN_TIERS } from "@/lib/economy-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agent/awaken/tiers
 * Public, read-only. The ETH-priced awaken tiers the frontend renders. Prices
 * are the canonical ETH strings from economy-constants (source of truth).
 */
export async function GET(req: Request) {
  const rl = await limit(req, "agent:awaken:tiers", { max: 120, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  return NextResponse.json({
    tiers: AWAKEN_TIERS.map((t) => ({
      key: t.key,
      label: t.label,
      eth: t.eth,
      blurb: t.blurb,
    })),
  });
}

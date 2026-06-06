import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCitizen } from "@/lib/citizens";
import { getTier } from "@/lib/agent-tier-store";
import { awakenKeyForTier } from "@/lib/economy-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agent/awaken/status?tokenId=
 * Public, read-only off-chain awaken state for a citizen. Awaken status is
 * keyed by tokenId (survives sale, like all progression).
 *
 * Response: { tokenId, awakened, awakenTier, awakenedAt, awakenBlock }
 */
export async function GET(req: Request) {
  const rl = await limit(req, "agent:awaken:status", { max: 120, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { searchParams } = new URL(req.url);
  const cid = parseInt(searchParams.get("tokenId") ?? "", 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040 || !getCitizen(cid)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const rec = await getTier(cid).catch(() => null);
  return NextResponse.json({
    tokenId: cid,
    awakened: rec?.awakened ?? false,
    // The store keeps a NUMBER (1/2); clients + public API expect the KEY.
    awakenTier: rec?.awakened ? awakenKeyForTier(rec.awakenTier) : null,
    awakenedAt: rec?.awakenedAt ?? 0,
    awakenBlock: rec?.awakenBlock ?? 0,
  });
}

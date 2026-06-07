import { NextResponse } from "next/server";
import { listActivations } from "@/lib/missions/unlock-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUBLIC, copy-safe activation proof. Surfaces ONLY:
 *   - count of citizens activated (real ETH unlocks)
 *   - the most-recent activated token IDs + how long ago
 * Deliberately omits wallets, tx hashes, and ETH amounts — no PII, and no price/
 * value signal (copy-safety: never imply investment/return). Used by the
 * <ActivationProof> strip on the home hero + citizen page. 60s CDN cache so a
 * traffic spike can't hammer the Upstash SCAN.
 */
export async function GET() {
  try {
    const s = await listActivations();
    const recent = s.recent.slice(0, 5).map((r) => ({ tokenId: r.tokenId, unlockedAt: r.unlockedAt }));
    return NextResponse.json(
      { count: s.activatedCount, recent },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch {
    // Fail quiet — the strip self-hides on count 0 / error.
    return NextResponse.json({ count: 0, recent: [] });
  }
}

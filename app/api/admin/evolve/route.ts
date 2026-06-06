/**
 * POST /api/admin/evolve
 * Header: X-Admin-Token: <ADMIN_PREFLIGHT_TOKEN>
 *
 * Flush PENDING agent ascensions to chain. Reads every tokenId whose paid tier
 * (lib/agent-tier-store) runs ahead of its anchored on-chain tier and, when the
 * registry is live, would call FreelonAgentRegistry.recordEvolution(tokenId,
 * tier, historyRoot) with the project owner key.
 *
 * The registry is NOT deployed yet, so the on-chain write is GUARDED: if
 * AGENT_REGISTRY_ADDRESS or the owner signer key is absent we DO NOT broadcast a
 * transaction — we return the queued list with wrote:0 and a reason. The
 * owner-signed write itself is left as a clearly-commented stub below.
 *
 * Fail-closed: if ADMIN_PREFLIGHT_TOKEN is not set the endpoint 404s (mirrors
 * the other admin routes). Token check is constant-time.
 */
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { ownerSignerConfigured, recordEvolutionOnChain } from "@/lib/onchain/agent-registry";
import { listPendingTokenIds, getTier, markOnChain } from "@/lib/agent-tier-store";
import { getProgress } from "@/lib/progression-store";
import { historyHash } from "@/lib/onchain/history-anchor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authed(req: Request): boolean {
  const expected = process.env.ADMIN_PREFLIGHT_TOKEN;
  if (!expected) return false;
  const got = req.headers.get("x-admin-token") || "";
  if (got.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!process.env.ADMIN_PREFLIGHT_TOKEN) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!authed(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pendingIds = await listPendingTokenIds();
  const queued = await Promise.all(
    pendingIds.map(async (tokenId) => {
      const rec = await getTier(tokenId);
      return { tokenId, tier: rec.tier, onChainTier: rec.onChainTier };
    }),
  );

  // Broadcast only when BOTH the deployed registry address AND the owner signer
  // key are configured. Until then this is an honest dry-run — a caller can
  // never assume an anchor that didn't happen.
  if (!ownerSignerConfigured()) {
    return NextResponse.json({ queued, wrote: 0, reason: "registry not live" });
  }

  // ── ON-CHAIN WRITE ────────────────────────────────────────────────────────
  // Owner-signed batch: for each pending citizen, anchor its paid tier with the
  // citizen's current history hash as the on-chain root, then stamp onChainTier
  // so the next batch only writes the delta. One tx per citizen; a single
  // failure is recorded and does not abort the rest of the batch.
  const results: { tokenId: number; tier: number; hash?: string; error?: string }[] = [];
  let wrote = 0;
  for (const item of queued) {
    try {
      const progress = await getProgress(item.tokenId);
      const root = historyHash(progress);
      const hash = await recordEvolutionOnChain(item.tokenId, item.tier, root);
      if (!hash) {
        results.push({ tokenId: item.tokenId, tier: item.tier, error: "write not configured" });
        continue;
      }
      await markOnChain(item.tokenId, item.tier);
      wrote += 1;
      results.push({ tokenId: item.tokenId, tier: item.tier, hash });
    } catch (e) {
      results.push({
        tokenId: item.tokenId,
        tier: item.tier,
        error: String(e).slice(0, 160),
      });
    }
  }

  return NextResponse.json({ queued, wrote, results });
}

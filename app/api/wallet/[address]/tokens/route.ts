import { NextResponse } from "next/server";
import { getWalletTokens } from "@/lib/wallet-tokens";
import { getProgress } from "@/lib/progression-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";

export const revalidate = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const rl = await limit(req, "wallet:tokens", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { address } = await params;
  const tokens = await getWalletTokens(address, 200);
  if (!tokens) {
    return NextResponse.json(
      { address, balance: 0, tokenIds: [], truncated: false, error: "invalid-address" },
      { status: 400 }
    );
  }
  // Life summaries for the rail (first 6 = what YourAgentsRail renders): level +
  // jobs are public counts (HISTORY_VISIBILITY_POLICY: counts are proof, bodies
  // are owner-only). Additive + fail-quiet — older consumers ignore `life`.
  const life: Record<number, { level: number; jobs: number }> = {};
  try {
    const rows = await Promise.all(
      tokens.tokenIds.slice(0, 6).map((id: number) => getProgress(id).catch(() => null))
    );
    for (const p of rows) if (p) life[p.tokenId] = { level: p.level, jobs: p.jobsCompleted };
  } catch { /* rail falls back to plain #id stamps */ }
  return NextResponse.json({ ...tokens, life });
}

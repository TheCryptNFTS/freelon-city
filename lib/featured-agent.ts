import { topTrainedAgents } from "@/lib/top-agents";

/**
 * Where "SEE AN AGENT" should point for a fresh (no-wallet) visitor: the
 * identity page of the current TOP-TRAINED agent, so the highest-traffic CTA
 * showcases a real specialized agent instead of always opening citizen #1.
 * Falls back to #1 only when the leaderboard has no specialized agents yet.
 *
 * Server-side + read-only (reads the progression leaderboard via topTrainedAgents).
 * Holder-aware overriding (open the viewer's OWN agent) happens client-side in
 * the Header, which knows the connected wallet.
 */
export async function topAgentTokenId(): Promise<number> {
  try {
    const [top] = await topTrainedAgents(1);
    if (top?.tokenId) return top.tokenId;
  } catch {/* fall back */}
  return 1;
}

export async function topAgentHref(): Promise<string> {
  return `/citizens/${await topAgentTokenId()}`;
}

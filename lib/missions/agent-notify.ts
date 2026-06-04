/**
 * Agent notification triggers — thin wrappers over notify() for the three
 * agent re-engagement moments: leveled up / hit a new rank, premium runs running
 * low, and runs earned (streak/referral). Each is best-effort + deduped by
 * eventKey, and writes to the on-site inbox + (opt-in) a DM.
 *
 * Copy is plain and specific — NO value/financial language, NO "on-chain".
 */
import { notify } from "@/lib/notify";

const id4 = (n: number) => n.toString().padStart(4, "0");

/** Fire when a citizen-agent reaches a new level (and optionally a new rank). */
export async function notifyAgentLevelUp(args: {
  wallet: string;
  tokenId: number;
  level: number;
  rankLabel?: string;
}): Promise<void> {
  const rank = args.rankLabel ? ` · now ${args.rankLabel}` : "";
  await notify({
    wallet: args.wallet,
    eventKey: `agent-levelup:${args.tokenId}:${args.level}`, // once per level
    kind: "agent-levelup",
    body: `⬡ Your FREELON #${id4(args.tokenId)} reached Level ${args.level}${rank}.`,
    href: `/citizens/${args.tokenId}`,
  }).catch(() => {});
}

/** Fire when premium runs drop to/through the low threshold (recharge nudge). */
export async function notifyRunsLow(args: {
  wallet: string;
  tokenId: number;
  remaining: number;
}): Promise<void> {
  await notify({
    wallet: args.wallet,
    // Dedupe per token per low-threshold crossing (not every single run).
    eventKey: `agent-runs-low:${args.tokenId}:${args.remaining}`,
    kind: "agent-runs-low",
    body: `⬡ FREELON #${id4(args.tokenId)} has ${args.remaining} premium run${args.remaining === 1 ? "" : "s"} left. Recharge to keep it working.`,
    href: `/citizens/${args.tokenId}`,
  }).catch(() => {});
}

/** Fire when a holder EARNS premium runs (streak/referral). */
export async function notifyRunsEarned(args: {
  wallet: string;
  tokenId: number;
  runs: number;
  reasonLabel: string;
}): Promise<void> {
  await notify({
    wallet: args.wallet,
    eventKey: `agent-runs-earned:${args.tokenId}:${args.reasonLabel}:${Date.now()}`,
    kind: "agent-runs-earned",
    body: `⬡ You earned ${args.runs} premium run${args.runs === 1 ? "" : "s"} (${args.reasonLabel}) for FREELON #${id4(args.tokenId)}.`,
    href: `/citizens/${args.tokenId}`,
  }).catch(() => {});
}

/** The "runs low" threshold — fire the nudge at/under this. */
export const RUNS_LOW_THRESHOLD = 3;

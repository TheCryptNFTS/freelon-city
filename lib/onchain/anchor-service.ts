/**
 * Anchor service — compute the Merkle root over all citizens with history, and
 * verify an individual citizen against a snapshot. READ-ONLY: this never sends a
 * transaction. Anchoring the root on-chain is a deliberate, wallet-signed action
 * the founder performs (see scripts/anchor-history.mjs), not something the app
 * does automatically.
 *
 * Flow:
 *   1. computeAnchor() → { root, count, snapshot } over the active set.
 *   2. founder sends `root` to FreelonHistoryRegistry.anchor() (one tx).
 *   3. saveSnapshot() persists the leaves so proofs can be regenerated later.
 *   4. verifyCitizen(tokenId) → a Merkle proof + local check against the stored
 *      root; the UI badge also reads the on-chain root to confirm they match.
 */
import { getProgress, listActiveTokenIds } from "@/lib/progression-store";
import { buildHistoryTree, leafFor } from "@/lib/onchain/history-anchor";
import { getProof, verifyProof, type Hex, type Leaf } from "@/lib/onchain/merkle";
import { upstash, hasUpstash } from "@/lib/upstash-client";

export type AnchorSnapshot = {
  epoch: number; // matches the on-chain anchor index once sent
  root: Hex;
  count: number;
  timestamp: number;
  leaves: Leaf[]; // the exact leaves the root was built from (for proof regen)
};

const SNAP_KEY = "freelon:anchor:snapshot:latest";
const snapMem: { current?: AnchorSnapshot } = {};

/** Compute the current root over every citizen that has history. No I/O writes. */
export async function computeAnchor(): Promise<{ root: Hex; count: number; leaves: Leaf[] }> {
  const ids = await listActiveTokenIds();
  const records = await Promise.all(ids.map((id) => getProgress(id)));
  const withHistory = records.filter((p) => p.level > 1 || p.reputation > 0 || p.jobsCompleted > 0);
  const tree = buildHistoryTree(withHistory);
  return { root: tree.root, count: withHistory.length, leaves: withHistory.map(leafFor) };
}

/** Persist a snapshot (after the founder anchors its root on-chain). */
export async function saveSnapshot(snap: AnchorSnapshot): Promise<void> {
  if (hasUpstash) {
    await upstash(["SET", SNAP_KEY, JSON.stringify(snap)]).catch(() => {});
    return;
  }
  snapMem.current = snap;
}

export async function getSnapshot(): Promise<AnchorSnapshot | null> {
  if (!hasUpstash) return snapMem.current ?? null;
  try {
    const raw = (await upstash(["GET", SNAP_KEY])) as string | null;
    return raw ? (JSON.parse(raw) as AnchorSnapshot) : null;
  } catch {
    return null;
  }
}

export type CitizenAnchorProof =
  | { anchored: false }
  | {
      anchored: true;
      epoch: number;
      root: Hex;
      anchoredAt: number;
      proof: Hex[];
      /** Does this citizen's CURRENT history still match what was anchored?
       *  false = the citizen did more work since the last anchor (needs re-anchor). */
      current: boolean;
    };

/**
 * Build the on-chain-verifiable proof for a citizen against the latest saved
 * snapshot. `current` tells the UI whether the live record still matches the
 * anchored leaf (it diverges as the agent does new work between anchors).
 */
export async function verifyCitizen(tokenId: number): Promise<CitizenAnchorProof> {
  const snap = await getSnapshot();
  if (!snap || snap.leaves.length === 0) return { anchored: false };

  const anchoredLeaf = snap.leaves.find((l) => l.tokenId === tokenId);
  if (!anchoredLeaf) return { anchored: false }; // wasn't in the anchored set

  // Regenerate the tree from the snapshot leaves to produce the proof.
  const { buildTree } = await import("@/lib/onchain/merkle");
  const tree = buildTree(snap.leaves);
  const proof = getProof(tree, anchoredLeaf);
  const okAgainstRoot = verifyProof(anchoredLeaf, proof, snap.root);
  if (!okAgainstRoot) return { anchored: false }; // snapshot inconsistent — fail safe

  // Is the live record still identical to what was anchored?
  const live = await getProgress(tokenId).catch(() => null);
  const current = !!live && leafFor(live).historyHash.toLowerCase() === anchoredLeaf.historyHash.toLowerCase();

  return { anchored: true, epoch: snap.epoch, root: snap.root, anchoredAt: snap.timestamp, proof, current };
}

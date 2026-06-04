/**
 * Turn a citizen's progression record into the canonical hash that gets anchored
 * on-chain, and build the Merkle tree over many citizens.
 *
 * The historyHash commits to the parts of the record that constitute "work
 * history": level, skills, jobs, reputation, and the memory log (the actual list
 * of what it did). It deliberately EXCLUDES volatile/derived fields. Canonical
 * JSON (sorted keys) so the same record always hashes identically — that's what
 * makes a later proof reproducible by anyone.
 */
import { keccak256, toHex } from "viem";
import type { CitizenProgress } from "@/lib/progression-store";
import { buildTree, leafHash, type Leaf, type Hex, type MerkleTree } from "@/lib/onchain/merkle";

/** Canonically serialize the history-bearing fields, sorted, then keccak256 it. */
export function historyHash(p: CitizenProgress): Hex {
  const canonical = {
    tokenId: p.tokenId,
    level: p.level,
    xp: p.xp,
    reputation: p.reputation,
    jobsCompleted: p.jobsCompleted,
    // skills sorted by key
    skills: Object.fromEntries(Object.entries(p.skills).sort(([a], [b]) => (a < b ? -1 : 1))),
    // memory log oldest→newest, only the durable fields (timestamps included so
    // the same logged work always hashes the same).
    memory: [...p.memoryLog]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((e) => ({ t: e.type, d: e.description, ts: e.timestamp, x: e.xpChange, s: e.signalChange })),
  };
  return keccak256(toHex(JSON.stringify(canonical)));
}

/** The leaf for a citizen. */
export function leafFor(p: CitizenProgress): Leaf {
  return { tokenId: p.tokenId, historyHash: historyHash(p) };
}

/** Build the anchorable tree from many progression records. */
export function buildHistoryTree(records: CitizenProgress[]): MerkleTree {
  return buildTree(records.map(leafFor));
}

/** Convenience: the leaf hash for a record (what indexes the tree). */
export function leafHashFor(p: CitizenProgress): Hex {
  return leafHash(leafFor(p));
}

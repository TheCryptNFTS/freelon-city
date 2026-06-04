/**
 * Minimal Merkle tree for ANCHORING citizen histories to Ethereum.
 *
 * Design: OpenZeppelin-compatible — leaves and internal nodes use keccak256, and
 * each internal node hashes the SORTED pair of its children
 * (keccak256(min(a,b) ++ max(a,b))). That's exactly what OZ `MerkleProof.verify`
 * expects, so a proof produced here verifies on-chain with the same library, and
 * also off-chain via `verifyProof` below (what the public "verify" badge uses).
 *
 * Pure + deterministic — no network, no I/O. The leaf for a citizen is
 * keccak256(abi.encodePacked(uint256 tokenId, bytes32 historyHash)); building the
 * historyHash from a progression record lives in history-anchor.ts.
 */
import { keccak256, encodePacked, concat } from "viem";

export type Hex = `0x${string}`;

/** A single tree leaf: a citizen's tokenId bound to a hash of its history. */
export type Leaf = { tokenId: number; historyHash: Hex };

/** Leaf hash = keccak256(abi.encodePacked(uint256 tokenId, bytes32 historyHash)). */
export function leafHash(leaf: Leaf): Hex {
  return keccak256(encodePacked(["uint256", "bytes32"], [BigInt(leaf.tokenId), leaf.historyHash]));
}

/** Hash an internal node from two children, sorting them first (OZ convention). */
function hashPair(a: Hex, b: Hex): Hex {
  return a.toLowerCase() <= b.toLowerCase()
    ? keccak256(concat([a, b]))
    : keccak256(concat([b, a]));
}

export type MerkleTree = {
  root: Hex;
  /** Bottom-up layers; layer[0] = sorted unique leaf hashes, last layer = [root]. */
  layers: Hex[][];
  /** leafHash → its index in layer[0], for proof generation. */
  indexOf: Map<Hex, number>;
};

/**
 * Build a tree from leaves. Leaf hashes are de-duplicated and SORTED so the tree
 * is canonical (same set of citizens → same root regardless of input order).
 * An odd node on a layer is promoted (hashed with itself is NOT done — OZ-style
 * promotes the lone node up unchanged).
 */
export function buildTree(leaves: Leaf[]): MerkleTree {
  const hashes = Array.from(new Set(leaves.map(leafHash))).sort((a, b) =>
    a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0,
  );
  const indexOf = new Map<Hex, number>();
  hashes.forEach((h, i) => indexOf.set(h, i));

  if (hashes.length === 0) {
    // Empty tree → zero root (nothing to anchor).
    return { root: ("0x" + "0".repeat(64)) as Hex, layers: [[]], indexOf };
  }

  const layers: Hex[][] = [hashes];
  while (layers[layers.length - 1].length > 1) {
    const cur = layers[layers.length - 1];
    const next: Hex[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      if (i + 1 < cur.length) next.push(hashPair(cur[i], cur[i + 1]));
      else next.push(cur[i]); // promote the odd one up unchanged
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers, indexOf };
}

/** A proof: the sibling hashes from leaf → root. Verifiable on- or off-chain. */
export type MerkleProof = Hex[];

/** Generate the proof for a given leaf. Throws if the leaf isn't in the tree. */
export function getProof(tree: MerkleTree, leaf: Leaf): MerkleProof {
  const h = leafHash(leaf);
  let idx = tree.indexOf.get(h);
  if (idx === undefined) throw new Error("leaf not in tree");
  const proof: MerkleProof = [];
  for (let layer = 0; layer < tree.layers.length - 1; layer++) {
    const nodes = tree.layers[layer];
    const isRight = idx % 2 === 1;
    const sibling = isRight ? idx - 1 : idx + 1;
    if (sibling < nodes.length) proof.push(nodes[sibling]);
    // else: odd promoted node — no sibling at this layer.
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/** Verify a leaf against a root using a proof (the public "verify" path). */
export function verifyProof(leaf: Leaf, proof: MerkleProof, root: Hex): boolean {
  let computed = leafHash(leaf);
  for (const sibling of proof) computed = hashPair(computed, sibling);
  return computed.toLowerCase() === root.toLowerCase();
}

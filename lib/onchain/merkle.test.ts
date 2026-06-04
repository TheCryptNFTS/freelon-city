import { describe, it, expect } from "vitest";
import { buildTree, getProof, verifyProof, leafHash, type Leaf } from "@/lib/onchain/merkle";
import { buildHistoryTree, historyHash, leafFor } from "@/lib/onchain/history-anchor";
import { empty, type CitizenProgress } from "@/lib/progression-store";

const H = (n: number): Leaf => ({ tokenId: n, historyHash: ("0x" + n.toString(16).padStart(64, "0")) as `0x${string}` });

describe("merkle tree", () => {
  it("every leaf verifies against the root via its proof", () => {
    const leaves = [1, 2, 3, 4, 5, 6, 7].map(H); // odd count → exercises promotion
    const tree = buildTree(leaves);
    for (const leaf of leaves) {
      const proof = getProof(tree, leaf);
      expect(verifyProof(leaf, proof, tree.root)).toBe(true);
    }
  });

  it("a leaf NOT in the tree fails verification", () => {
    const tree = buildTree([1, 2, 3].map(H));
    const outsider = H(999);
    // can't get a proof for a missing leaf
    expect(() => getProof(tree, outsider)).toThrow();
    // and a forged proof from a real leaf doesn't validate the outsider
    const realProof = getProof(tree, H(1));
    expect(verifyProof(outsider, realProof, tree.root)).toBe(false);
  });

  it("root is canonical — independent of input order", () => {
    const a = buildTree([1, 2, 3, 4].map(H)).root;
    const b = buildTree([4, 1, 3, 2].map(H)).root;
    expect(a).toBe(b);
  });

  it("changing one leaf changes the root (tamper-evidence)", () => {
    const before = buildTree([1, 2, 3].map(H)).root;
    const after = buildTree([1, 2, 3].map(H).map((l) => (l.tokenId === 2 ? H(22) : l))).root;
    expect(after).not.toBe(before);
  });

  it("single-leaf tree: root equals the leaf hash, empty proof verifies", () => {
    const leaf = H(1);
    const tree = buildTree([leaf]);
    expect(tree.root).toBe(leafHash(leaf));
    expect(verifyProof(leaf, [], tree.root)).toBe(true);
  });

  it("empty tree → zero root", () => {
    expect(buildTree([])).toMatchObject({ root: "0x" + "0".repeat(64) });
  });
});

describe("history hashing", () => {
  function rec(tokenId: number, mutate: (p: CitizenProgress) => void): CitizenProgress {
    const p = empty(tokenId);
    mutate(p);
    return p;
  }

  it("same history → same hash; different history → different hash", () => {
    const a = rec(7, (p) => { p.level = 10; p.skills.risk = 5; p.memoryLog = [{ type: "mission", description: "Red-team [focus:x]", xpChange: 10, signalChange: 0, timestamp: 1000 }]; });
    const a2 = rec(7, (p) => { p.level = 10; p.skills.risk = 5; p.memoryLog = [{ type: "mission", description: "Red-team [focus:x]", xpChange: 10, signalChange: 0, timestamp: 1000 }]; });
    const b = rec(7, (p) => { p.level = 11; p.skills.risk = 5; });
    expect(historyHash(a)).toBe(historyHash(a2));
    expect(historyHash(a)).not.toBe(historyHash(b));
  });

  it("a citizen's anchored history verifies against the tree root", () => {
    const records = [
      rec(1, (p) => { p.level = 32; p.skills.strategy = 61; p.jobsCompleted = 61; }),
      rec(404, (p) => { p.level = 15; p.skills.research = 21; }),
      rec(1337, (p) => { p.level = 19; p.skills.risk = 29; }),
    ];
    const tree = buildHistoryTree(records);
    for (const r of records) {
      const proof = getProof(tree, leafFor(r));
      expect(verifyProof(leafFor(r), proof, tree.root)).toBe(true);
    }
  });
});

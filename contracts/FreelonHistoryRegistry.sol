// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * FreelonHistoryRegistry — an append-only log of Merkle roots that anchor the
 * off-chain work-history of FREELON CITY agents to Ethereum.
 *
 * WHY: the FREELON NFT contract (0xa79e73…b5504) is sealed and cannot store
 * per-citizen history. This separate, minimal registry lets the project commit a
 * single Merkle root of ALL citizen histories in one transaction. Anyone can
 * then verify that a given citizen's history is included under an anchored root
 * (off-chain, with a Merkle proof) — making the history tamper-EVIDENT without a
 * gas-paid write per job.
 *
 * What it proves: a root anchored at block N means "this exact set of histories
 * existed at block N." If a holder saves their Merkle proof, any later change to
 * their citizen's history will fail to verify against that anchored root. It does
 * NOT prevent the project from maintaining a different off-chain DB — it makes
 * divergence detectable. Word public copy as "anchored / verifiable", not
 * "immutable".
 *
 * Trust model: only `owner` can anchor (the project). Roots are append-only and
 * never deleted, so the history of anchors is itself permanent on-chain.
 */
contract FreelonHistoryRegistry {
    address public owner;

    struct Anchor {
        bytes32 root;
        uint64 timestamp;
        uint256 count; // number of citizens included (informational)
    }

    Anchor[] public anchors;

    event RootAnchored(uint256 indexed epoch, bytes32 indexed root, uint256 count, uint64 timestamp);
    event OwnerTransferred(address indexed from, address indexed to);

    error NotOwner();
    error ZeroRoot();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnerTransferred(address(0), msg.sender);
    }

    /// @notice Append a new Merkle root anchoring the current histories.
    /// @param root  Merkle root over all citizen leaves.
    /// @param count Number of citizens included (for display; not enforced).
    /// @return epoch The index of this anchor.
    function anchor(bytes32 root, uint256 count) external onlyOwner returns (uint256 epoch) {
        if (root == bytes32(0)) revert ZeroRoot();
        epoch = anchors.length;
        anchors.push(Anchor({ root: root, timestamp: uint64(block.timestamp), count: count }));
        emit RootAnchored(epoch, root, count, uint64(block.timestamp));
    }

    /// @notice The most recent anchored root (reverts if none yet).
    function latest() external view returns (bytes32 root, uint64 timestamp, uint256 count, uint256 epoch) {
        uint256 n = anchors.length;
        require(n > 0, "no anchors");
        Anchor storage a = anchors[n - 1];
        return (a.root, a.timestamp, a.count, n - 1);
    }

    function anchorCount() external view returns (uint256) {
        return anchors.length;
    }

    function transferOwnership(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        emit OwnerTransferred(owner, to);
        owner = to;
    }

    /// @notice Verify a leaf against a stored root with a sorted-pair Merkle proof
    ///         (OpenZeppelin convention). Pure helper for on-chain verification.
    function verify(bytes32 root, bytes32 leaf, bytes32[] calldata proof) external pure returns (bool) {
        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 p = proof[i];
            computed = computed <= p
                ? keccak256(abi.encodePacked(computed, p))
                : keccak256(abi.encodePacked(p, computed));
        }
        return computed == root;
    }
}

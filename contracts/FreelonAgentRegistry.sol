// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * FreelonAgentRegistry — binds a sealed FREELON CITY NFT to an on-chain "agent
 * identity" and records its training tier. This is the on-chain identity
 * primitive other apps resolve to learn that a given citizen has been "awakened"
 * into an agent (an ERC-8004-style binding) and how far it has been trained.
 *
 * WHY: the FREELON NFT contract (0xa79e73…b5504) is sealed and cannot store an
 * agent URI or tier per citizen. Like FreelonHistoryRegistry, this is a separate,
 * minimal side-contract that records the extra state without touching the base
 * collection. It does not move, wrap, or escrow the NFT — it only references it
 * by tokenId and reads ownership from the sealed contract at awaken time.
 *
 * What it records: per tokenId, an agentURI (where the agent's identity/config
 * lives), when it was awakened, who awakened it, a training tier (uint8), and an
 * optional per-token history root (bytes32) anchoring its off-chain work-history.
 *
 * Trust model — two distinct gates:
 *   • awaken() is HOLDER-gated: msg.sender must currently own the token, verified
 *     by calling ownerOf(tokenId) on the sealed ERC-721. The holder declares the
 *     agent identity for a citizen they actually hold, and may re-awaken to update
 *     the agentURI (e.g. after a sale, the new owner can rebind).
 *   • recordEvolution() is OWNER-gated (the PROJECT) — same trust model as the
 *     history anchor: the project attests training progress (tier) and may anchor
 *     a per-token history root. Tier is monotonic (never downgraded).
 *
 * Wording note (mirrors FreelonHistoryRegistry): records here are anchored /
 * attested, not "immutable". Ownership is read at awaken time from the live ERC-721
 * and is not re-checked later; an awakener field is a record of who bound it, not
 * proof of current ownership. The history root makes off-chain divergence
 * tamper-EVIDENT, exactly as in the history anchor.
 */

/// @dev Minimal interface to the sealed FREELON ERC-721. Only ownerOf is needed.
interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract FreelonAgentRegistry {
    address public owner;

    /// @notice The sealed FREELON ERC-721 this registry binds agents to.
    ///         Set once in the constructor and never changed.
    IERC721 public immutable freelon;

    struct Agent {
        string agentURI; // where the agent's identity/config lives (off-chain)
        uint64 awakenedAt; // block timestamp of the first awaken
        address awakener; // who bound this token (record, not live-ownership proof)
        uint8 tier; // training tier, starts at 0; monotonically increasing
        bytes32 historyRoot; // optional per-token history root (zero = none)
        bool awakened; // true once awaken() has been called for this token
    }

    mapping(uint256 => Agent) private agents;

    event Awakened(uint256 indexed tokenId, address indexed owner, string agentURI);
    event Evolved(uint256 indexed tokenId, uint8 tier, bytes32 historyRoot);
    event OwnerTransferred(address indexed from, address indexed to);

    error NotOwner();
    error ZeroAddress();
    error NotTokenHolder();
    error NotAwakened();
    error TierNotIncreasing();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @param freelonNft Address of the sealed FREELON ERC-721 collection.
    constructor(address freelonNft) {
        if (freelonNft == address(0)) revert ZeroAddress();
        freelon = IERC721(freelonNft);
        owner = msg.sender;
        emit OwnerTransferred(address(0), msg.sender);
    }

    /// @notice Awaken a citizen into an agent identity. HOLDER-initiated: the
    ///         caller must currently own `tokenId` on the sealed ERC-721.
    /// @dev    Re-awakening is allowed — the current holder may update agentURI.
    ///         awakenedAt/awakener record the FIRST awaken and are not overwritten.
    /// @param tokenId  The FREELON token to bind.
    /// @param agentURI Where this agent's identity/config lives.
    function awaken(uint256 tokenId, string calldata agentURI) external {
        if (freelon.ownerOf(tokenId) != msg.sender) revert NotTokenHolder();

        Agent storage a = agents[tokenId];
        if (!a.awakened) {
            a.awakenedAt = uint64(block.timestamp);
            a.awakener = msg.sender;
            a.awakened = true;
        }
        a.agentURI = agentURI;

        emit Awakened(tokenId, msg.sender, agentURI);
    }

    /// @notice Record a training evolution for an awakened agent. OWNER-gated
    ///         (the project), same trust model as the history anchor.
    /// @dev    Tier must strictly increase (no downgrade). The token must already
    ///         be awakened. historyRoot may be zero to mean "none".
    /// @param tokenId     The awakened FREELON token.
    /// @param tier        New training tier; must be > current tier.
    /// @param historyRoot Optional per-token history root (zero = none).
    function recordEvolution(uint256 tokenId, uint8 tier, bytes32 historyRoot) external onlyOwner {
        Agent storage a = agents[tokenId];
        if (!a.awakened) revert NotAwakened();
        if (tier <= a.tier) revert TierNotIncreasing();

        a.tier = tier;
        a.historyRoot = historyRoot;

        emit Evolved(tokenId, tier, historyRoot);
    }

    /// @notice Read the full agent record for a token. Unawakened tokens return
    ///         zero-values with `awakened == false`.
    function getAgent(uint256 tokenId)
        external
        view
        returns (
            string memory agentURI,
            uint64 awakenedAt,
            address awakener,
            uint8 tier,
            bytes32 historyRoot,
            bool awakened
        )
    {
        Agent storage a = agents[tokenId];
        return (a.agentURI, a.awakenedAt, a.awakener, a.tier, a.historyRoot, a.awakened);
    }

    /// @notice Whether a token has been awakened into an agent identity.
    function isAwakened(uint256 tokenId) external view returns (bool) {
        return agents[tokenId].awakened;
    }

    function transferOwnership(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        emit OwnerTransferred(owner, to);
        owner = to;
    }
}

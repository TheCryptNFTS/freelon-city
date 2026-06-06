/**
 * Agent-registry reads — resolve a citizen's on-chain agent identity + training
 * tier from FreelonAgentRegistry. READ-ONLY: this never sends a transaction.
 *
 * The registry is NOT deployed yet. Its address comes from the optional env var
 * AGENT_REGISTRY_ADDRESS, so EVERY helper here degrades gracefully: when the var
 * is unset (or invalid) the helpers return null/empty rather than throwing —
 * mirroring how lib/wallet-tokens.ts and the anchor service guard optional config
 * (e.g. OPENSEA_API_KEY / Upstash).
 *
 * The viem client / chain / RPC fallback transport is replicated from
 * lib/owner-of.ts and lib/wallet-tokens.ts so we hit the same endpoints (the
 * 4-RPC fallback that fixed the "could not verify ownership" holder bug) and
 * never a different hardcoded RPC.
 */
import { createPublicClient, http, fallback, isAddress } from "viem";
import { mainnet } from "viem/chains";

// Same configured-RPC + 4-endpoint public fallback chain used by owner-of.ts and
// wallet-tokens.ts. A bare http() points at cloudflare-eth.com which rate-limits
// aggressively; the fallback list avoids the resulting false negatives.
const CONFIGURED_RPC =
  process.env.ETH_RPC_URL ||
  process.env.NEXT_PUBLIC_ETH_RPC_URL ||
  null;

const PUBLIC_FALLBACKS = [
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org",
];

const client = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [
      ...(CONFIGURED_RPC ? [http(CONFIGURED_RPC, { timeout: 5_000, retryCount: 1 })] : []),
      ...PUBLIC_FALLBACKS.map((u) => http(u, { timeout: 4_000, retryCount: 1 })),
    ],
    { rank: false, retryCount: 1 },
  ),
});

// Minimal ABI: the two views + the two events emitted by FreelonAgentRegistry.
const ABI = [
  {
    name: "getAgent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "agentURI", type: "string" },
      { name: "awakenedAt", type: "uint64" },
      { name: "awakener", type: "address" },
      { name: "tier", type: "uint8" },
      { name: "historyRoot", type: "bytes32" },
      { name: "awakened", type: "bool" },
    ],
  },
  {
    name: "isAwakened",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "recordEvolution",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "tier", type: "uint8" },
      { name: "historyRoot", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "Awakened",
    type: "event",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
    ],
  },
  {
    name: "Evolved",
    type: "event",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "tier", type: "uint8", indexed: false },
      { name: "historyRoot", type: "bytes32", indexed: false },
    ],
  },
] as const;

export type AgentRecord = {
  tokenId: number;
  agentURI: string;
  awakenedAt: number; // unix seconds
  awakener: `0x${string}`;
  tier: number;
  historyRoot: `0x${string}`;
  awakened: boolean;
};

/**
 * The configured registry address, or null when unset/invalid. Until the
 * contract is deployed and AGENT_REGISTRY_ADDRESS is set, this returns null and
 * every read helper short-circuits to null/empty.
 */
export function agentRegistryAddress(): `0x${string}` | null {
  const raw = process.env.AGENT_REGISTRY_ADDRESS;
  if (!raw || !isAddress(raw)) return null;
  return raw.toLowerCase() as `0x${string}`;
}

/**
 * Resolve a citizen's on-chain agent record. Returns null when:
 *   • the registry isn't configured (env var unset/invalid),
 *   • the RPC read fails, or
 *   • the token has not been awakened.
 * Never throws.
 */
export async function getAgentRecord(tokenId: number): Promise<AgentRecord | null> {
  const address = agentRegistryAddress();
  if (!address) return null;

  try {
    const result = (await client.readContract({
      address,
      abi: ABI,
      functionName: "getAgent",
      args: [BigInt(tokenId)],
    })) as readonly [string, bigint, `0x${string}`, number, `0x${string}`, boolean];

    const [agentURI, awakenedAt, awakener, tier, historyRoot, awakened] = result;
    if (!awakened) return null;

    return {
      tokenId,
      agentURI,
      awakenedAt: Number(awakenedAt),
      awakener,
      tier: Number(tier),
      historyRoot,
      awakened,
    };
  } catch {
    return null;
  }
}

/**
 * Whether the project owner-signed on-chain write path is fully configured:
 * needs both the deployed registry address AND the owner private key. The admin
 * evolve batch uses this to decide whether to broadcast or report a dry-run.
 */
export function ownerSignerConfigured(): boolean {
  return !!agentRegistryAddress() && !!process.env.AGENT_REGISTRY_OWNER_KEY;
}

/**
 * PROJECT-SIGNED on-chain write: anchor a citizen's training tier via
 * recordEvolution(tokenId, tier, historyRoot). onlyOwner on-chain, so this is
 * signed with AGENT_REGISTRY_OWNER_KEY. Returns the tx hash, or null when the
 * write path isn't configured (registry undeployed / key absent) — callers must
 * treat null as "not anchored" and never assume success. Lazy-loads the wallet
 * client so the read path stays write-free.
 */
export async function recordEvolutionOnChain(
  tokenId: number,
  tier: number,
  historyRoot: `0x${string}`,
): Promise<`0x${string}` | null> {
  const address = agentRegistryAddress();
  const rawKey = process.env.AGENT_REGISTRY_OWNER_KEY;
  if (!address || !rawKey) return null;

  const { createWalletClient } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const account = privateKeyToAccount(
    (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`,
  );
  const wallet = createWalletClient({
    account,
    chain: mainnet,
    transport: CONFIGURED_RPC ? http(CONFIGURED_RPC) : http(PUBLIC_FALLBACKS[0]),
  });

  const hash = await wallet.writeContract({
    address,
    abi: ABI,
    functionName: "recordEvolution",
    args: [BigInt(tokenId), tier, historyRoot],
  });
  return hash;
}

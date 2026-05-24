import { createPublicClient, http, fallback } from "viem";
import { mainnet } from "viem/chains";
import { CONTRACT } from "@/lib/constants";
import { getWalletTokens } from "@/lib/wallet-tokens";

const ABI = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// Same 4-RPC fallback chain used by lib/wallet-tokens.ts and the
// client hooks. A bare http() points at cloudflare-eth.com, which
// rate-limits aggressively and produced the "could not verify
// ownership" Discord bug for real holders (@counselman_john, #0884).
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

export async function ownerOf(tokenId: number): Promise<string | null> {
  try {
    const owner = (await client.readContract({
      address: CONTRACT as `0x${string}`,
      abi: ABI,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    })) as string;
    return owner.toLowerCase();
  } catch {
    return null;
  }
}

export type OwnershipVerdict =
  | { status: "owner" }
  | { status: "not-owner"; actualOwner: string | null }
  | { status: "unknown" };

/**
 * Server-side multi-source ownership check.
 *
 * Tries RPC ownerOf first (4-RPC fallback). If that fails, cross-checks
 * via getWalletTokens (which itself falls back to OpenSea v2). Returns
 * "unknown" only when both sources fail entirely, so callers can surface
 * a retry state instead of falsely denying a real holder.
 */
export async function verifyOwnership(
  tokenId: number,
  walletAddress: string,
): Promise<OwnershipVerdict> {
  const wallet = walletAddress.toLowerCase();

  // Source 1: RPC ownerOf
  const onChainOwner = await ownerOf(tokenId);
  if (onChainOwner) {
    return onChainOwner === wallet
      ? { status: "owner" }
      : { status: "not-owner", actualOwner: onChainOwner };
  }

  // Source 2: OpenSea-backed wallet/tokens — does the wallet currently
  // hold this token id?
  try {
    const tokens = await getWalletTokens(wallet, 200);
    if (tokens && Array.isArray(tokens.tokenIds)) {
      if (tokens.tokenIds.includes(tokenId)) return { status: "owner" };
      // Wallet enumerated successfully and does not hold this id —
      // but we never confirmed the *actual* owner via RPC, so we
      // still don't know who owns it. Treat as not-owner only when
      // the wallet's token list was definitively enumerated AND the
      // balance is greater than zero (otherwise OpenSea lag could
      // produce a false negative for a freshly-acquired citizen).
      if (tokens.balance > 0 && !tokens.truncated) {
        return { status: "not-owner", actualOwner: null };
      }
    }
  } catch {/* fall through */}

  return { status: "unknown" };
}

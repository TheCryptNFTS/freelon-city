"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http, fallback } from "viem";
import { mainnet } from "viem/chains";
import { CONTRACT } from "@/lib/constants";

const ABI = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// Same 4-RPC fallback chain as lib/wallet-tokens.ts. The default viem
// http() points at cloudflare-eth.com which rate-limits aggressively
// and was making this hook silently return owner=null, causing the
// "channel says you don't own #100 even though I do" Discord bug.
const CONFIGURED = process.env.NEXT_PUBLIC_ETH_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || null;
const FALLBACKS = [
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org",
];
const client = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [
      ...(CONFIGURED ? [http(CONFIGURED, { timeout: 5_000 })] : []),
      ...FALLBACKS.map((u) => http(u, { timeout: 4_000 })),
    ],
    { rank: false, retryCount: 1 },
  ),
});

/**
 * Returns whether the connected wallet owns the given citizen.
 *
 * Two independent ownership sources, tried in order, so a single
 * RPC rate-limit doesn't produce a false "you don't own it" against
 * a real owner:
 *   1. RPC ownerOf (with 4-RPC fallback above)
 *   2. Server-side /api/wallet/[addr]/tokens (OpenSea-backed) — asks
 *      whether the connected wallet currently holds the token id.
 *
 * Resolves to "not owner" only when both agree. If both fail, sets
 * `error: true` so the caller can render a retry state instead of
 * a misleading "rejected" screen.
 */
export function useOwnsCitizen(citizenId: number, walletAddress: string | null): {
  loading: boolean;
  isOwner: boolean;
  ownerAddress: string | null;
  error: boolean;
} {
  const [owner, setOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      setOwner(null);
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      // Source 1: RPC ownerOf
      let rpcOwner: string | null = null;
      try {
        const addr = (await client.readContract({
          address: CONTRACT as `0x${string}`,
          abi: ABI,
          functionName: "ownerOf",
          args: [BigInt(citizenId)],
        })) as string;
        rpcOwner = String(addr).toLowerCase();
      } catch {
        rpcOwner = null;
      }
      if (cancelled) return;
      if (rpcOwner) {
        setOwner(rpcOwner);
        setLoading(false);
        return;
      }

      // Source 2: server-side wallet/tokens fallback. If the wallet
      // we're checking holds this token id, treat ownership as
      // confirmed. The server endpoint uses RPC + OpenSea internally
      // with its own fallback, so it survives even when our RPCs
      // are misbehaving.
      try {
        const r = await fetch(`/api/wallet/${walletAddress.toLowerCase()}/tokens`, { cache: "no-store" });
        if (r.ok) {
          const j = (await r.json()) as { tokenIds?: number[] };
          if (Array.isArray(j.tokenIds) && j.tokenIds.includes(citizenId)) {
            if (!cancelled) {
              setOwner(walletAddress.toLowerCase());
              setLoading(false);
            }
            return;
          }
        }
      } catch {/* fall through */}

      // Both sources failed entirely → don't claim "not owner",
      // surface an error so the UI can show "retry" instead.
      if (!cancelled) {
        setError(true);
        setOwner(null);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [citizenId, walletAddress]);

  return {
    loading,
    error,
    ownerAddress: owner,
    isOwner: !!walletAddress && !!owner && walletAddress.toLowerCase() === owner,
  };
}

"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
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

const client = createPublicClient({ chain: mainnet, transport: http() });

/** Returns whether the connected wallet owns the given citizen. */
export function useOwnsCitizen(citizenId: number, walletAddress: string | null): {
  loading: boolean;
  isOwner: boolean;
  ownerAddress: string | null;
} {
  const [owner, setOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.readContract({
      address: CONTRACT as `0x${string}`,
      abi: ABI,
      functionName: "ownerOf",
      args: [BigInt(citizenId)],
    })
      .then((addr) => { if (!cancelled) { setOwner(String(addr).toLowerCase()); setLoading(false); } })
      .catch(() => { if (!cancelled) { setOwner(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [citizenId]);

  return {
    loading,
    ownerAddress: owner,
    isOwner: !!walletAddress && !!owner && walletAddress.toLowerCase() === owner,
  };
}

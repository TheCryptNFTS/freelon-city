"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { CONTRACT } from "@/lib/constants";

const ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const publicClient = createPublicClient({ chain: mainnet, transport: http() });

// window.ethereum type lives in lib/ethereum.d.ts

export type HolderState = {
  loading: boolean;
  address: string | null;
  balance: number | null;
  isHolder: boolean;
};

/** Tracks the connected wallet's holder status. No effect if no wallet present. */
export function useHolder(): HolderState {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) { setLoading(false); return; }
    let cancelled = false;
    window.ethereum
      .request({ method: "eth_accounts" })
      .then(async (accs) => {
        const list = accs as string[];
        if (cancelled) return;
        if (!list || !list[0]) { setLoading(false); return; }
        setAddress(list[0]);
        try {
          const bal = (await publicClient.readContract({
            address: CONTRACT as `0x${string}`,
            abi: ABI,
            functionName: "balanceOf",
            args: [list[0] as `0x${string}`],
          })) as bigint;
          if (!cancelled) setBalance(Number(bal));
        } catch {
          if (!cancelled) setBalance(0);
        }
        if (!cancelled) setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { loading, address, balance, isHolder: (balance ?? 0) > 0 };
}

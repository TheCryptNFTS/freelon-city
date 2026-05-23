"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http, fallback } from "viem";
import { mainnet } from "viem/chains";
import { CONTRACT } from "@/lib/constants";

/**
 * DISCORD BUG · 2026-05-24 — @Nevarest reported the PFP studio said
 * "you're not a holder" when they actually hold citizens. Root cause:
 * useHolder only checked window.ethereum, so paste-address-sync users
 * (who never connect a wallet) were classified as not-holders even
 * with a valid freelon_addr cookie + held citizens. Same bug class
 * as the earlier /channel false-negative; fix is the same shape —
 * accept the cookie-saved address as an ownership source, then
 * verify via the server-side wallet/tokens endpoint.
 */
function readAddrCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )freelon_addr=([^;]+)/);
  if (!m) return null;
  const val = decodeURIComponent(m[1]).toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(val)) return null;
  return val;
}

const ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Same 4-RPC fallback chain as lib/wallet-tokens.ts — stops the
// "undercount" bug when the default endpoint rate-limits or
// returns a stale block.
const CONFIGURED = process.env.NEXT_PUBLIC_ETH_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || null;
const FALLBACKS = [
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org",
];
const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [
      ...(CONFIGURED ? [http(CONFIGURED, { timeout: 5_000 })] : []),
      ...FALLBACKS.map((u) => http(u, { timeout: 4_000 })),
    ],
    { rank: false, retryCount: 1 },
  ),
});

// window.ethereum type lives in lib/ethereum.d.ts

export type HolderState = {
  loading: boolean;
  address: string | null;
  balance: number | null;
  isHolder: boolean;
};

/**
 * Tracks the connected wallet's holder status.
 *
 * Two ownership sources, tried in order, so a paste-address-sync user
 * who never connected MetaMask is still recognized:
 *   1. window.ethereum (MetaMask / wallet-connect) → RPC balanceOf
 *   2. freelon_addr cookie (paste-address sync)    → RPC balanceOf
 *
 * If RPC returns 0 (could be true zero OR a stale block), cross-check
 * via /api/wallet/[addr]/tokens (OpenSea-backed server route). When
 * RPC fails entirely, also fall back to that route.
 *
 * Closes Nevarest's Discord bug — synced paste-address users were
 * shown as not-a-holder on /pfp.
 */
export function useHolder(): HolderState {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolveBalance(addr: string): Promise<number> {
      // Try RPC first
      let rpcBal: number | null = null;
      try {
        const bal = (await publicClient.readContract({
          address: CONTRACT as `0x${string}`,
          abi: ABI,
          functionName: "balanceOf",
          args: [addr as `0x${string}`],
        })) as bigint;
        rpcBal = Number(bal);
        if (rpcBal > 0) return rpcBal;
      } catch {
        rpcBal = null;
      }
      // RPC said 0 or failed — confirm via OpenSea server route
      try {
        const r = await fetch(`/api/wallet/${addr.toLowerCase()}/tokens`, { cache: "no-store" });
        if (r.ok) {
          const j = (await r.json()) as { tokenIds?: number[]; balance?: number };
          if (Array.isArray(j.tokenIds) && j.tokenIds.length > 0) return j.tokenIds.length;
          if (typeof j.balance === "number" && j.balance > 0) return j.balance;
        }
      } catch {/* fall through */}
      return rpcBal ?? 0;
    }

    (async () => {
      // Source 1: window.ethereum
      let addr: string | null = null;
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accs = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
          if (accs && accs[0]) addr = String(accs[0]).toLowerCase();
        } catch { /* fall through */ }
      }
      // Source 2: cookie-saved paste-address
      if (!addr) addr = readAddrCookie();
      if (cancelled) return;
      if (!addr) { setLoading(false); return; }
      setAddress(addr);
      const bal = await resolveBalance(addr);
      if (cancelled) return;
      setBalance(bal);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  return { loading, address, balance, isHolder: (balance ?? 0) > 0 };
}

import { createPublicClient, http, isAddress } from "viem";
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
  {
    name: "tokenOfOwnerByIndex",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const RPC_URL =
  process.env.ETH_RPC_URL ||
  process.env.NEXT_PUBLIC_ETH_RPC_URL ||
  undefined; // viem will fall back to its default public RPC

const client = createPublicClient({
  chain: mainnet,
  // Hard 5s timeout — prevents wallet RPC stalls from hanging the whole route
  transport: http(RPC_URL, { timeout: 5_000, retryCount: 1 }),
});

export function isValidAddress(addr: string): addr is `0x${string}` {
  return typeof addr === "string" && isAddress(addr);
}

export function normalizeAddress(addr: string): `0x${string}` | null {
  if (!isValidAddress(addr)) return null;
  return addr.toLowerCase() as `0x${string}`;
}

/**
 * Get the FREELON balance for a wallet.
 *
 * Two-source resolution: try RPC first, fall back to OpenSea v2 if the
 * RPC fails or returns 0 *and* OpenSea reports tokens. This stops the
 * "real holder shown as NON-holder" false negative when the default
 * public RPC (cloudflare-eth.com via viem) rate-limits us.
 *
 * Returns `null` when both sources fail — callers can treat this as
 * "unknown" instead of lying with 0.
 */
export async function getWalletBalance(addr: string): Promise<number> {
  const result = await getWalletBalanceVerified(addr);
  return result ?? 0;
}

/** Like getWalletBalance but returns null when truly unknown (both sources failed). */
export async function getWalletBalanceVerified(addr: string): Promise<number | null> {
  if (!isValidAddress(addr)) return 0;

  // Source 1: RPC
  let rpcBal: number | null = null;
  try {
    const bal = (await client.readContract({
      address: CONTRACT as `0x${string}`,
      abi: ABI,
      functionName: "balanceOf",
      args: [addr],
    })) as bigint;
    rpcBal = Number(bal);
  } catch {
    rpcBal = null;
  }

  if (rpcBal !== null && rpcBal > 0) return rpcBal;

  // Source 2: OpenSea fallback — ask for the wallet's NFTs in this
  // collection. We just need the count; we don't paginate here.
  const apiKey = process.env.OPENSEA_API_KEY;
  if (apiKey) {
    try {
      const url = `https://api.opensea.io/api/v2/chain/ethereum/account/${addr.toLowerCase()}/nfts?collection=freelons&limit=200`;
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 5_000);
      const r = await fetch(url, {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        signal: ctrl.signal,
        next: { revalidate: 60 },
      });
      clearTimeout(to);
      if (r.ok) {
        const d = (await r.json()) as { nfts?: Array<{ contract?: string; identifier?: string }> };
        // Defensive: confirm the NFTs are actually ours
        const ours = (d.nfts || []).filter(
          (n) => (n.contract || "").toLowerCase() === CONTRACT.toLowerCase(),
        );
        if (ours.length > 0) return ours.length;
        // If OpenSea agrees zero AND we have a confirmed RPC zero → real zero.
        if (rpcBal === 0) return 0;
      }
    } catch {
      /* fall through */
    }
  }

  // RPC says zero but no OpenSea key (or OpenSea also failed) → trust the
  // zero only when RPC actually answered. If RPC also failed → null/unknown.
  if (rpcBal !== null) return rpcBal;
  return null;
}

/**
 * Get the list of token IDs owned by an address. Reads via tokenOfOwnerByIndex.
 * Returns ids in the order the contract reports them (typically index order).
 * Caps at `max` to avoid hammering RPC on very large wallets.
 */
export async function getWalletTokenIds(
  addr: string,
  max = 200
): Promise<number[]> {
  if (!isValidAddress(addr)) return [];
  const balance = await getWalletBalance(addr);
  if (balance <= 0) return [];

  const count = Math.min(balance, max);
  const indices = Array.from({ length: count }, (_, i) => i);

  const results = await Promise.all(
    indices.map(async (i) => {
      try {
        const id = (await client.readContract({
          address: CONTRACT as `0x${string}`,
          abi: ABI,
          functionName: "tokenOfOwnerByIndex",
          args: [addr, BigInt(i)],
        })) as bigint;
        return Number(id);
      } catch {
        return null;
      }
    })
  );

  return results.filter((x): x is number => x !== null);
}

export type WalletTokens = {
  address: `0x${string}`;
  balance: number;
  tokenIds: number[];
  truncated: boolean;
};

export async function getWalletTokens(
  addr: string,
  max = 200
): Promise<WalletTokens | null> {
  const norm = normalizeAddress(addr);
  if (!norm) return null;
  const balance = await getWalletBalance(norm);
  if (balance <= 0) {
    return { address: norm, balance: 0, tokenIds: [], truncated: false };
  }

  // Try RPC first for full token-id enumeration
  let ids = await getWalletTokenIds(norm, max);

  // Fallback: if RPC enumeration came up short (balance > 0 but RPC returned
  // empty/partial), backfill from OpenSea so the wallet page actually shows
  // the holder's citizens. The previous behaviour silently lost their tokens.
  if (ids.length < balance) {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (apiKey) {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 5_000);
        const url = `https://api.opensea.io/api/v2/chain/ethereum/account/${norm}/nfts?collection=freelons&limit=${Math.min(max, 200)}`;
        const r = await fetch(url, {
          headers: { "X-API-KEY": apiKey, accept: "application/json" },
          signal: ctrl.signal,
          next: { revalidate: 60 },
        });
        clearTimeout(to);
        if (r.ok) {
          const d = (await r.json()) as { nfts?: Array<{ contract?: string; identifier?: string }> };
          const osIds = (d.nfts || [])
            .filter((n) => (n.contract || "").toLowerCase() === CONTRACT.toLowerCase())
            .map((n) => Number(n.identifier))
            .filter((n) => Number.isFinite(n) && n >= 1 && n <= 4040);
          // Merge — RPC ids first (already verified on-chain), append any
          // OpenSea ids not already present.
          const set = new Set(ids);
          for (const id of osIds) {
            if (!set.has(id)) ids.push(id);
            set.add(id);
          }
        }
      } catch {
        /* keep whatever ids we have */
      }
    }
  }

  // If we still couldn't enumerate but we know balance > 0, return the
  // balance honestly so the UI doesn't lie. The gallery will look empty
  // but the wallet won't be told "0 citizens" — it'll show balance: N.
  return {
    address: norm,
    balance,
    tokenIds: ids,
    truncated: balance > ids.length,
  };
}

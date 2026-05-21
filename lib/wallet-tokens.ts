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
  transport: http(RPC_URL),
});

export function isValidAddress(addr: string): addr is `0x${string}` {
  return typeof addr === "string" && isAddress(addr);
}

export function normalizeAddress(addr: string): `0x${string}` | null {
  if (!isValidAddress(addr)) return null;
  return addr.toLowerCase() as `0x${string}`;
}

/** Get the FREELON balance for a wallet. Returns 0 on any error. */
export async function getWalletBalance(addr: string): Promise<number> {
  if (!isValidAddress(addr)) return 0;
  try {
    const bal = (await client.readContract({
      address: CONTRACT as `0x${string}`,
      abi: ABI,
      functionName: "balanceOf",
      args: [addr],
    })) as bigint;
    return Number(bal);
  } catch {
    return 0;
  }
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
  const ids = balance > 0 ? await getWalletTokenIds(norm, max) : [];
  return {
    address: norm,
    balance,
    tokenIds: ids,
    truncated: balance > ids.length,
  };
}

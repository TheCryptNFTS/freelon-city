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

const RPC_URL =
  process.env.ETH_RPC_URL || process.env.NEXT_PUBLIC_ETH_RPC_URL || undefined;

const client = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL, { timeout: 4_000, retryCount: 1 }),
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

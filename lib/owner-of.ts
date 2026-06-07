import { createPublicClient, http, fallback, type PublicClient } from "viem";
import { mainnet, apeChain } from "viem/chains";
import { CONTRACT } from "@/lib/constants";
import { getWalletTokens } from "@/lib/wallet-tokens";
import { collectionBySlug } from "@/lib/collections";
import { DEFAULT_SLUG } from "@/lib/agent-subject";

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
  "https://eth-pokt.nodies.app",
  "https://eth.rpc.blxrbdn.com",
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org",
];

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [
      ...(CONFIGURED_RPC ? [http(CONFIGURED_RPC, { timeout: 5_000, retryCount: 1 })] : []),
      ...PUBLIC_FALLBACKS.map((u) => http(u, { timeout: 4_000, retryCount: 1 })),
    ],
    { rank: false, retryCount: 1 },
  ),
});

// OOGIES live on ApeChain (chain 33139), so multi-collection ownership needs a
// second client. Its own RPC list (configurable via APECHAIN_RPC_URL) + the
// chain's default transport as fallback.
const APECHAIN_RPC = process.env.APECHAIN_RPC_URL || null;
const apechainClient = createPublicClient({
  chain: apeChain,
  transport: fallback(
    [
      ...(APECHAIN_RPC ? [http(APECHAIN_RPC, { timeout: 5_000, retryCount: 1 })] : []),
      http(apeChain.rpcUrls.default.http[0], { timeout: 5_000, retryCount: 1 }),
    ],
    { rank: false, retryCount: 1 },
  ),
});

/** Resolve the right RPC client + contract for a collection slug. Defaults to
 *  the flagship FREELONS contract on mainnet so every legacy tokenId-only call
 *  site behaves exactly as before. */
function resolve(slug: string): { client: PublicClient; contract: `0x${string}` } | null {
  if (slug === DEFAULT_SLUG) return { client: mainnetClient as PublicClient, contract: CONTRACT as `0x${string}` };
  const c = collectionBySlug(slug);
  if (!c) return null;
  const client = c.chain === "ape_chain" ? apechainClient : mainnetClient;
  return { client: client as PublicClient, contract: c.contract as `0x${string}` };
}

export async function ownerOf(tokenId: number, slug: string = DEFAULT_SLUG): Promise<string | null> {
  const r = resolve(slug);
  if (!r) return null;
  try {
    const owner = (await r.client.readContract({
      address: r.contract,
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
 * Slug-aware OpenSea fallback for SISTER collections. Asks OpenSea v2 for the
 * wallet's NFTs in this collection and checks whether the claimed tokenId is
 * among them. Deliberately CONFIRM-ONLY: it returns true only on a positive
 * match, never a denial — OpenSea can lag a chain transfer by minutes, so a
 * miss is treated as "couldn't confirm", not "doesn't own". This exists so a
 * real holder isn't locked out by a griefable 503 when the sister RPC is
 * flooded (H1); it can only ever upgrade "unknown" → "owner". */
async function ownedViaOpenSea(tokenId: number, wallet: string, slug: string): Promise<boolean> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return false;
  const c = collectionBySlug(slug);
  if (!c) return false;
  const want = String(tokenId);
  const contract = c.contract.toLowerCase();
  let next: string | null = null;
  const MAX_PAGES = 3; // up to 600 of this collection's NFTs in the wallet
  for (let page = 0; page < MAX_PAGES; page++) {
    try {
      const u = new URL(`https://api.opensea.io/api/v2/chain/${c.chain}/account/${wallet}/nfts`);
      u.searchParams.set("collection", slug);
      u.searchParams.set("limit", "200");
      if (next) u.searchParams.set("next", next);
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 5_000);
      const r = await fetch(u.toString(), {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        signal: ctrl.signal,
        next: { revalidate: 60 },
      });
      clearTimeout(to);
      if (!r.ok) return false;
      const d = (await r.json()) as {
        nfts?: Array<{ contract?: string; identifier?: string }>;
        next?: string | null;
      };
      const hit = (d.nfts || []).some(
        (n) => (n.contract || "").toLowerCase() === contract && String(n.identifier) === want,
      );
      if (hit) return true;
      next = d.next ?? null;
      if (!next) return false;
    } catch {
      return false;
    }
  }
  return false;
}

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
  slug: string = DEFAULT_SLUG,
): Promise<OwnershipVerdict> {
  const wallet = walletAddress.toLowerCase();

  // Source 1: RPC ownerOf (chain + contract resolved from the slug)
  const onChainOwner = await ownerOf(tokenId, slug);
  if (onChainOwner) {
    return onChainOwner === wallet
      ? { status: "owner" }
      : { status: "not-owner", actualOwner: onChainOwner };
  }

  // Source 2 (sisters): slug-aware OpenSea CONFIRM-ONLY fallback. When the
  // sister RPC fails, a real holder can still be granted via OpenSea so a
  // flooded RPC can't grief them into a 503 (H1). A miss stays "unknown"
  // (safe retry), never a false denial.
  if (slug !== DEFAULT_SLUG) {
    if (await ownedViaOpenSea(tokenId, wallet, slug)) return { status: "owner" };
    return { status: "unknown" };
  }
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

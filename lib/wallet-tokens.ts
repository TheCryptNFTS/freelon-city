import { createPublicClient, http, fallback, isAddress } from "viem";
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

// Multi-RPC fallback transport. We try the user-configured RPC first (if
// any), then a curated list of reliable public endpoints. viem's
// `fallback` cycles to the next on error so a single rate-limit doesn't
// produce a false-zero balance — which is what caused the "NOT A HOLDER"
// bug for real holders.
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

const TRANSPORTS = [
  ...(CONFIGURED_RPC ? [http(CONFIGURED_RPC, { timeout: 5_000, retryCount: 1 })] : []),
  ...PUBLIC_FALLBACKS.map((u) => http(u, { timeout: 4_000, retryCount: 1 })),
];

const client = createPublicClient({
  chain: mainnet,
  transport: fallback(TRANSPORTS, { rank: false, retryCount: 1 }),
});

// ── Balance cache (per server instance, 90-second TTL) ──────────────
// Keeps repeated page renders / API hits from re-querying RPC + OpenSea
// for the same wallet within a short window. Stale-but-fresh-enough.
type CacheEntry = { value: number; expires: number };
const balanceCache = new Map<string, CacheEntry>();
const BALANCE_TTL_MS = 90_000;

function cacheGet(addr: string): number | null {
  const e = balanceCache.get(addr);
  if (!e) return null;
  if (e.expires < Date.now()) {
    balanceCache.delete(addr);
    return null;
  }
  return e.value;
}

function cacheSet(addr: string, value: number) {
  balanceCache.set(addr, { value, expires: Date.now() + BALANCE_TTL_MS });
  // Keep the map bounded to avoid unbounded growth on long-running servers
  if (balanceCache.size > 5000) {
    const oldestKey = balanceCache.keys().next().value;
    if (oldestKey) balanceCache.delete(oldestKey);
  }
}

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

/** Like getWalletBalance but returns null when truly unknown (both sources failed).
 *  Pass `bypassCache: true` to force a fresh lookup (used by the
 *  WalletConnect retry button + `?nocache=1` on the API route). */
export async function getWalletBalanceVerified(addr: string, opts: { bypassCache?: boolean } = {}): Promise<number | null> {
  if (!isValidAddress(addr)) return 0;
  const lower = addr.toLowerCase();

  // Cache hit — avoid hammering RPC + OpenSea on repeated lookups
  if (!opts.bypassCache) {
    const cached = cacheGet(lower);
    if (cached !== null) return cached;
  } else {
    // Force-refresh: clear stale entry
    balanceCache.delete(lower);
  }

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

  if (rpcBal !== null && rpcBal > 0) {
    cacheSet(lower, rpcBal);
    return rpcBal;
  }

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
        if (ours.length > 0) {
          // DO NOT cache OpenSea-derived counts. OpenSea can lag 5-10 min
          // after a chain transfer, so caching a stale undercount would
          // pin the wrong number for 90s. Only RPC counts get cached.
          return ours.length;
        }
        // If OpenSea agrees zero AND we have a confirmed RPC zero → real zero.
        if (rpcBal === 0) {
          cacheSet(lower, 0);
          return 0;
        }
      }
    } catch {
      /* fall through */
    }
  }

  // RPC says zero but no OpenSea key (or OpenSea also failed) → trust the
  // zero only when RPC actually answered. If RPC also failed → null/unknown.
  if (rpcBal !== null) {
    cacheSet(lower, rpcBal);
    return rpcBal;
  }
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
  //
  // Discord 2026-05-25 (@Peterhawk71): "site only recognizes 4 of my
  // Citizens". Root cause: OpenSea fallback only fetched page 1 (limit
  // 200 across all collections in the wallet), so wallets that own
  // OTHER NFTs alongside their freelons got truncated when freelons
  // tokens sat past the page-1 boundary. Fix: paginate the OpenSea
  // account/nfts endpoint until we either match balance or hit page
  // budget.
  if (ids.length < balance) {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (apiKey) {
      try {
        const set = new Set(ids);
        let next: string | null = null;
        const MAX_PAGES = 5; // 5 × 200 = up to 1000 NFTs scanned per wallet
        for (let page = 0; page < MAX_PAGES; page++) {
          if (set.size >= balance) break;
          if (set.size >= max) break;
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), 5_000);
          const u = new URL(`https://api.opensea.io/api/v2/chain/ethereum/account/${norm}/nfts`);
          u.searchParams.set("collection", "freelons");
          u.searchParams.set("limit", "200");
          if (next) u.searchParams.set("next", next);
          const r = await fetch(u.toString(), {
            headers: { "X-API-KEY": apiKey, accept: "application/json" },
            signal: ctrl.signal,
            next: { revalidate: 60 },
          });
          clearTimeout(to);
          if (!r.ok) break;
          const d = (await r.json()) as {
            nfts?: Array<{ contract?: string; identifier?: string }>;
            next?: string | null;
          };
          const osIds = (d.nfts || [])
            .filter((n) => (n.contract || "").toLowerCase() === CONTRACT.toLowerCase())
            .map((n) => Number(n.identifier))
            .filter((n) => Number.isFinite(n) && n >= 1 && n <= 4040);
          for (const id of osIds) {
            if (!set.has(id)) ids.push(id);
            set.add(id);
          }
          next = d.next ?? null;
          if (!next) break;
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

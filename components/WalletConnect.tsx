"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createPublicClient, http, fallback } from "viem";
import { mainnet } from "viem/chains";
import { CONTRACT } from "@/lib/constants";
import { stampViewerAddr, clearViewerAddr } from "@/lib/viewer-cookie";

// Last-connected wallet from the persisted cookie. Used to re-hydrate the
// connected UI on load when the injected provider isn't reporting an account
// yet (locked wallet, extension still waking up, in-app browser).
function readViewerCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )freelon_addr=([^;]+)/);
  if (!m) return null;
  const v = decodeURIComponent(m[1]).toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(v) ? v : null;
}

// Minimal ERC-721 ABI for balanceOf
const ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Use the configured RPC first, then a curated list of reliable public
// endpoints. viem's `fallback` rotates on failure — closes the
// "undercount NFTs because cloudflare-eth rate-limited" gap.
const CONFIGURED_RPC =
  process.env.NEXT_PUBLIC_ETH_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  null;

const FALLBACK_RPCS = [
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org",
];

const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [
      ...(CONFIGURED_RPC ? [http(CONFIGURED_RPC, { timeout: 5_000 })] : []),
      ...FALLBACK_RPCS.map((u) => http(u, { timeout: 4_000 })),
    ],
    { rank: false, retryCount: 1 },
  ),
});

// window.ethereum type lives in lib/ethereum.d.ts

type Status = "idle" | "checking" | "holder" | "non-holder" | "error";

export function WalletConnect() {
  const [addr, setAddr] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /**
   * Holder check with two independent sources so a single rate-limit
   * never produces a false "NOT A HOLDER" against a real holder:
   *   1. RPC balanceOf via viem
   *   2. OpenSea collection-nfts-by-account fallback if RPC fails
   * Only resolve to "non-holder" when BOTH agree the wallet holds 0.
   */
  const checkHolder = useCallback(async (address: string, force = false) => {
    setStatus("checking");
    setCount(null);
    // Stamp the viewer cookie immediately so personal modules across the
    // site (MyRank, MyCivStandings, Watchlist) recognise this wallet
    // even before the balance resolves.
    stampViewerAddr(address);

    // Source 1: RPC
    let rpcCount: number | null = null;
    try {
      const balance = (await publicClient.readContract({
        address: CONTRACT as `0x${string}`,
        abi: ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      })) as bigint;
      rpcCount = Number(balance);
    } catch {
      rpcCount = null;
    }

    if (rpcCount !== null && rpcCount > 0) {
      setCount(rpcCount);
      setStatus("holder");
      return;
    }

    // Source 2: server-side OpenSea fallback (our wallet-tokens endpoint
    // counts on-chain holdings via OpenSea v2). Authoritative for balance.
    let openSeaCount: number | null = null;
    try {
      // ?nocache=1 forces the server to skip the 90s balance cache. Used
      // by the refresh button + by any explicit retry — stops a stale
      // OpenSea count (post-transfer lag) from pinning for 90 seconds.
      const url = `/api/wallet/${address.toLowerCase()}/balance${force ? "?nocache=1" : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { balance?: number | null; verified?: boolean };
        // Only trust the server when it confirmed a source resolved.
        // null + verified:false means "unknown — both sources failed", and
        // we treat that as still-unknown rather than zero.
        if (j.verified === true && typeof j.balance === "number") openSeaCount = j.balance;
      }
    } catch {
      openSeaCount = null;
    }

    if (openSeaCount !== null && openSeaCount > 0) {
      setCount(openSeaCount);
      setStatus("holder");
      return;
    }

    // If BOTH sources failed (null), don't lie — show retry.
    if (rpcCount === null && openSeaCount === null) {
      setCount(null);
      setStatus("error");
      return;
    }

    // Both agreed 0
    setCount(0);
    setStatus("non-holder");
  }, []);

  useEffect(() => {
    // 2026-05-29 persistence fix — "wallet doesn't stay connected". The UI
    // used to depend solely on eth_accounts at mount; if the injected
    // provider was absent or returned [] (wallet locked, extension still
    // initializing, in-app browser), the pill flipped back to CONNECT even
    // though the freelon_addr cookie still held the last-connected wallet.
    // Now we seed from the cookie first so the connected state persists, then
    // upgrade to the live provider account if/when it reports one.
    const cookieAddr = readViewerCookie();
    if (cookieAddr) {
      setAddr(cookieAddr);
      void checkHolder(cookieAddr);
    }
    if (typeof window === "undefined" || !window.ethereum) return;
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accs) => {
        const list = accs as string[];
        if (list && list[0] && list[0].toLowerCase() !== cookieAddr) {
          setAddr(list[0]);
          void checkHolder(list[0]);
        }
      })
      .catch(() => {});
  }, [checkHolder]);

  async function connect() {
    setErr(null);
    if (typeof window === "undefined") return;
    if (!window.ethereum) {
      const ua = navigator.userAgent || "";
      const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
      const inMM = /MetaMask/i.test(ua);
      if (isMobile && !inMM) {
        const host = window.location.host + window.location.pathname;
        window.location.href = `https://metamask.app.link/dapp/${host}`;
        return;
      }
      setErr("No wallet found. Install MetaMask, Rainbow, or open on mobile.");
      return;
    }
    setBusy(true);
    try {
      const accs = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (accs && accs[0]) {
        setAddr(accs[0]);
        await checkHolder(accs[0]);
      }
    } catch (e) {
      setErr((e as Error).message || "Connection refused.");
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    setAddr(null);
    setCount(null);
    setStatus("idle");
    setErr(null);
    clearViewerAddr();
  }

  function retry() {
    if (!addr) return;
    // Force-refresh bypasses the server cache so a stale undercount
    // (e.g. just after a transfer, OpenSea lagging) won't pin.
    void checkHolder(addr, true);
  }

  const isHolder = status === "holder" && (count ?? 0) > 0;
  const short = addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  if (!addr) {
    return (
      <div className="wallet-connect">
        <button onClick={connect} className="btn" type="button" disabled={busy}>
          <span className="lbl">{busy ? "CONNECTING" : "WALLET"}</span>
          <span className="ttl">{busy ? "…" : "CONNECT"} <span className="ar">⬡</span></span>
        </button>
        {err && <div className="wallet-err">{err}</div>}
      </div>
    );
  }

  let badge: string;
  if (status === "checking" || count === null) badge = "SCANNING SIGNAL…";
  else if (status === "error") badge = "SIGNAL LOST · TAP TO RETRY";
  else if (isHolder) badge = `HOLDER · ${count} CITIZEN${count !== 1 ? "S" : ""}`;
  else badge = "0 CITIZENS";

  // Deep-link the badge so a connected holder can jump straight into
  // their wallet page (gallery, civ breakdown, hex log, portfolio).
  // Non-holders go to /sync; error state is a retry button.
  const badgeHref = isHolder
    ? `/wallet/${addr.toLowerCase()}#citizens`
    : status === "non-holder"
      ? `/sync?h=${addr.slice(0, 8)}`
      : null;

  return (
    <div className="wallet-state" data-holder={isHolder ? "1" : "0"}>
      <div className="addr">
        <span className="dot" />
        {short}
      </div>
      {badgeHref ? (
        <Link
          href={badgeHref}
          className="holder-badge"
          style={{
            color: "inherit",
            textDecoration: "none",
            font: "inherit",
          }}
        >
          {badge}{isHolder ? " →" : ""}
        </Link>
      ) : (
        <button
          onClick={status === "error" ? retry : undefined}
          className="holder-badge"
          type="button"
          disabled={status !== "error"}
          style={{
            background: "transparent",
            border: "none",
            color: "inherit",
            font: "inherit",
            cursor: status === "error" ? "pointer" : "default",
            padding: 0,
          }}
        >
          {badge}
        </button>
      )}
      <button
        onClick={retry}
        className="refresh"
        type="button"
        aria-label="Refresh count"
        title="Refresh holdings (force re-check after a buy/sell)"
        disabled={status === "checking"}
        style={{
          background: "transparent",
          border: "1px solid var(--line-2)",
          color: "var(--ink-dim)",
          fontSize: 11,
          padding: "2px 6px",
          marginLeft: 6,
          borderRadius: 999,
          cursor: "pointer",
          fontFamily: "var(--mono2)",
          letterSpacing: "0.1em",
        }}
      >
        ↻
      </button>
      <button onClick={disconnect} className="disconnect" type="button" aria-label="Disconnect">×</button>
      {err && <div className="wallet-err">{err}</div>}
    </div>
  );
}

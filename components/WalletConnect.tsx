"use client";
import { useEffect, useState, useCallback } from "react";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { CONTRACT } from "@/lib/constants";

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

// Use the configured RPC if present — falling back to viem's default public
// endpoint causes "NOT A HOLDER" false negatives under load because the
// default cloudflare-eth.com gateway rate-limits aggressively.
const RPC_URL =
  process.env.NEXT_PUBLIC_ETH_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  undefined;

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL),
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
  const checkHolder = useCallback(async (address: string) => {
    setStatus("checking");
    setCount(null);

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
      const res = await fetch(`/api/wallet/${address.toLowerCase()}/balance`, {
        cache: "no-store",
      });
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
    if (typeof window === "undefined" || !window.ethereum) return;
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accs) => {
        const list = accs as string[];
        if (list && list[0]) {
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
  }

  function retry() {
    if (!addr) return;
    void checkHolder(addr);
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

  return (
    <div className="wallet-state" data-holder={isHolder ? "1" : "0"}>
      <div className="addr">
        <span className="dot" />
        {short}
      </div>
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
      <button onClick={disconnect} className="disconnect" type="button" aria-label="Disconnect">×</button>
      {err && <div className="wallet-err">{err}</div>}
    </div>
  );
}

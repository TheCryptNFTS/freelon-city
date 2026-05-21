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

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// window.ethereum type lives in lib/ethereum.d.ts

export function WalletConnect() {
  const [addr, setAddr] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const checkHolder = useCallback(async (address: string) => {
    try {
      const balance = (await publicClient.readContract({
        address: CONTRACT as `0x${string}`,
        abi: ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      })) as bigint;
      setCount(Number(balance));
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    // Restore previous session if any
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
    if (typeof window === "undefined" || !window.ethereum) {
      setErr("No wallet found. Install MetaMask or Rainbow.");
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
    setErr(null);
  }

  const isHolder = (count ?? 0) > 0;
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
  return (
    <div className="wallet-state" data-holder={isHolder ? "1" : "0"}>
      <div className="addr">
        <span className="dot" />
        {short}
      </div>
      <div className="holder-badge">
        {count === null ? "VERIFYING…" : isHolder ? `HOLDER · ${count} CITIZEN${count > 1 ? "S" : ""}` : "NOT A HOLDER"}
      </div>
      <button onClick={disconnect} className="disconnect" type="button" aria-label="Disconnect">×</button>
      {err && <div className="wallet-err">{err}</div>}
    </div>
  );
}

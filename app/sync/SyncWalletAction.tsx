"use client";
/**
 * <SyncWalletAction /> — wallet-connect entry on /sync.
 *
 * 2026-05-26 funnel repair: prior /sync only let visitors paste an
 * address — no `eth_requestAccounts` MetaMask prompt — so Nonz and
 * other holders had to go to /vault to actually connect, then come
 * back. This component restores the primary funnel: click CONNECT
 * WALLET → MetaMask/Rainbow opens → on success the address is
 * stamped to the same `freelon_addr` cookie the header WalletConnect
 * uses, so every personalized module on the site recognises them.
 *
 * Pasted-address fallback below this component is preserved
 * (WalletScanner handles it).
 *
 * The connect logic is intentionally a small local helper rather than
 * a shared import — same 20 lines as components/WalletConnect.tsx,
 * but isolating it means a /sync edit can't break the header pill
 * and vice versa. Each surface owns its own connect path.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { stampViewerAddr as stampViewerCookie } from "@/lib/viewer-cookie";

type Status = "idle" | "connecting" | "connected" | "error";

export function SyncWalletAction() {
  const [addr, setAddr] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState<string | null>(null);

  // On mount, detect an already-connected wallet (no prompt — just
  // mirrors the header's eth_accounts read). Lets a returning user
  // see "CONNECTED · 0xabcd…1234" instead of being asked to connect
  // again on every visit.
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accs) => {
        const list = accs as string[];
        if (list && list[0]) {
          setAddr(list[0]);
          setStatus("connected");
          stampViewerCookie(list[0]);
        }
      })
      .catch(() => {});
  }, []);

  async function connect() {
    setErr(null);
    if (typeof window === "undefined") return;

    // No injected provider: on mobile, deep-link into MetaMask's
    // in-app browser so the user lands back here connected. Desktop
    // gets a clear instruction.
    if (!window.ethereum) {
      const ua = navigator.userAgent || "";
      const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
      const inMM = /MetaMask/i.test(ua);
      if (isMobile && !inMM) {
        // Preserve query (?ref= attribution) + hash through the MetaMask
        // round-trip — otherwise the in-app browser lands on bare /sync and the
        // referral + return context are lost (upgrade audit #16).
        const host = window.location.host + window.location.pathname + window.location.search + window.location.hash;
        window.location.href = `https://metamask.app.link/dapp/${host}`;
        return;
      }
      setErr("No wallet found. Install MetaMask, Rainbow, or open this page on mobile.");
      setStatus("error");
      return;
    }

    setStatus("connecting");
    try {
      const accs = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (accs && accs[0]) {
        setAddr(accs[0]);
        setStatus("connected");
        stampViewerCookie(accs[0]);
      } else {
        setErr("No account returned.");
        setStatus("error");
      }
    } catch (e) {
      setErr((e as Error).message || "Connection refused.");
      setStatus("error");
    }
  }

  if (status === "connected" && addr) {
    const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    return (
      <div className="sync-wallet-action">
        <div className="sync-wallet-action__connected">
          <span className="sync-wallet-action__dot" aria-hidden />
          <span className="sync-wallet-action__label">CONNECTED · {short}</span>
        </div>
        <div className="sync-wallet-action__primaryRow">
          <Link href={`/wallet/${addr.toLowerCase()}`} className="btn btn-primary sync-wallet-action__primaryBtn">
            <span className="ttl">READ MY SIGNAL →</span>
          </Link>
          <Link href="/archive" className="btn btn-secondary sync-wallet-action__secondaryBtn">
            <span className="ttl">VIEW THE ARCHIVE →</span>
          </Link>
        </div>
      </div>
    );
  }

  const busy = status === "connecting";
  return (
    <div className="sync-wallet-action">
      <button
        type="button"
        onClick={connect}
        disabled={busy}
        className="btn btn-primary sync-wallet-action__primaryBtn"
      >
        <span className="ttl">
          {busy ? "OPENING WALLET…" : "CONNECT WALLET ⬡"}
        </span>
      </button>
      {/* Wallet-anxiety reassurance — connect is eth_requestAccounts only
          (address read), never a signature or transaction. Concrete facts,
          no overclaim ("100% safe" etc.). */}
      <p
        style={{
          marginTop: 8,
          fontSize: 11.5,
          letterSpacing: "0.08em",
          color: "var(--ink-dim)",
          textAlign: "center",
        }}
      >
        Read-only · no transaction · we never move your assets
      </p>
      {err && (
        <p className="sync-wallet-action__err" role="alert">
          ⚠ {err}
        </p>
      )}
      <p className="sync-wallet-action__hint">
        or paste an address / ENS / X handle below
      </p>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

/**
 * Shared client hook for "who is viewing this page".
 *
 *   freelon_addr cookie  → set by WalletConnect on successful connect
 *                         (and StampViewerAddr on the wallet page).
 *   x_session cookie     → set by OAuth callback. Not readable from JS
 *                         (httpOnly). We instead probe /api/x/me to
 *                         resolve the verified handle.
 *
 * Components use this to wallet-bind their CTAs (e.g. the X sign-in
 * link needs ?bind=<wallet>) and to know whether to show "CONNECT WALLET",
 * "SIGN IN WITH X", or "CLAIM" as the next action.
 */

export type ViewerState = {
  /** Connected wallet (lowercase 0x), or null. From the freelon_addr cookie. */
  addr: string | null;
  /** Whether we've finished the initial read on mount (avoids SSR/CSR flash). */
  ready: boolean;
};

function readAddrCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )freelon_addr=([^;]+)/);
  if (!m) return null;
  const val = decodeURIComponent(m[1]).toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(val)) return null;
  return val;
}

export function useViewerAddr(): ViewerState {
  const [state, setState] = useState<ViewerState>({ addr: null, ready: false });

  useEffect(() => {
    setState({ addr: readAddrCookie(), ready: true });
    // Listen for storage / focus events so the wallet badge changes
    // reflect across other open tabs / after MetaMask connect events.
    const refresh = () => setState({ addr: readAddrCookie(), ready: true });
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  return state;
}

export type XVerificationState = {
  /** True once the probe completed. */
  ready: boolean;
  /** True if a session cookie was found AND it's bound to a wallet. */
  verified: boolean;
  /** The bound X handle if verified, else null. */
  xHandle: string | null;
};

/**
 * Probes /api/x/me to determine whether the current browser has a valid
 * x_session cookie. Use this to gate "claim" CTAs on whether the user
 * needs to sign in with X first.
 *
 * If `bindWallet` is provided, the probe also confirms the session is
 * bound to that specific wallet. Useful on the wallet detail page.
 */
export function useXVerification(bindWallet?: string | null): XVerificationState {
  const [state, setState] = useState<XVerificationState>({
    ready: false,
    verified: false,
    xHandle: null,
  });

  useEffect(() => {
    let cancelled = false;
    const url = bindWallet
      ? `/api/x/me?bind=${encodeURIComponent(bindWallet)}`
      : `/api/x/me`;
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { verification?: { xHandle?: string } | null } | null) => {
        if (cancelled) return;
        const v = j?.verification;
        if (v && v.xHandle) {
          setState({ ready: true, verified: true, xHandle: v.xHandle });
        } else {
          setState({ ready: true, verified: false, xHandle: null });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ ready: true, verified: false, xHandle: null });
      });
    return () => { cancelled = true; };
  }, [bindWallet]);

  return state;
}

/**
 * Returns the right X-sign-in URL for the current viewer. If a wallet
 * is connected, binds the OAuth flow to that address so the resulting
 * session can act on the wallet's behalf. If no wallet, returns null —
 * callers should disable / hint "connect wallet first" instead.
 */
export function xSignInHref(viewerAddr: string | null): string | null {
  if (!viewerAddr) return null;
  return `/api/x/start?bind=${encodeURIComponent(viewerAddr)}`;
}

"use client";
import Link from "next/link";
import { useViewerAddr, useXVerification, xSignInHref } from "@/lib/use-viewer";

/**
 * The clickable "next action" button inside the carrier health banner.
 *
 * Picks the right CTA based on the viewer's auth state for THIS wallet:
 *
 *   ① Wallet not connected anywhere      → "CONNECT WALLET →" (scrolls to header)
 *   ② Connected to a different wallet    → "SWITCH WALLET →" (scrolls to header)
 *   ③ Connected, but no X session yet    → "SIGN IN WITH X →" (OAuth start, bound to this wallet)
 *   ④ Connected + verified               → "CLAIM TODAY'S 10 ⬡ →" (go to /carrier)
 *
 * Closes the silent-fail gap where users would sign in with X before
 * connecting a wallet and then wonder why their tithes/claims rejected.
 */
export function CarrierHealthCta({
  pageWallet,
  baseColor,
  showCount = true,
}: {
  /** The wallet whose page we're on (server-rendered route param). */
  pageWallet: string;
  /** Accent color from the parent banner. */
  baseColor: string;
  /** Whether to show the +10 ⬡ count in the label (false when banner is tight). */
  showCount?: boolean;
}) {
  const viewer = useViewerAddr();
  const x = useXVerification(viewer.addr);
  const targetLower = pageWallet.toLowerCase();
  const viewerLower = (viewer.addr || "").toLowerCase();

  if (!viewer.ready) return null;

  // Resolve next-action label + destination
  let label: string;
  let href: string;
  let scrollToHeader = false;

  if (!viewer.addr) {
    label = "CONNECT WALLET →";
    href = "#wallet-connect"; // scrolls to header
    scrollToHeader = true;
  } else if (viewerLower !== targetLower) {
    label = "SWITCH WALLET →";
    href = "#wallet-connect";
    scrollToHeader = true;
  } else if (!x.ready) {
    // Still probing — show a neutral CTA
    label = "...";
    href = "/carrier";
  } else if (!x.verified) {
    label = "SIGN IN WITH X →";
    href = xSignInHref(viewer.addr) || "/carrier";
  } else {
    label = showCount ? "CLAIM TODAY'S 10 ⬡ →" : "CLAIM TODAY →";
    href = "/carrier";
  }

  const style: React.CSSProperties = {
    marginLeft: "auto",
    padding: "8px 14px",
    borderRadius: 8,
    border: `1px solid ${baseColor}`,
    background: `${baseColor}1a`,
    color: baseColor,
    fontFamily: "var(--mono2)",
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    fontWeight: 600,
    textDecoration: "none",
    whiteSpace: "nowrap",
    cursor: "pointer",
  };

  if (scrollToHeader) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          // Scroll to top so the WalletConnect button is visible
          window.scrollTo({ top: 0, behavior: "smooth" });
          // Visual nudge: focus the header wallet connect if present
          setTimeout(() => {
            const btn = document.querySelector<HTMLButtonElement>(".wallet-connect button");
            btn?.focus();
          }, 400);
        }}
        style={style}
      >
        {label}
      </button>
    );
  }

  // Hard navigation for OAuth start (must hit the server endpoint, not client routing)
  if (href.startsWith("/api/")) {
    return (
      <a href={href} style={style}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} style={style}>
      {label}
    </Link>
  );
}

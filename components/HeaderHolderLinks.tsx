"use client";
import Link from "next/link";
import { useHolder } from "@/lib/useHolder";

/**
 * Wallet-aware nav links. The front door stays condensed for logged-OUT
 * newcomers (founder's "radical condense"); but once a wallet is CONNECTED, a
 * returning holder gets their map back — My Citizens (roster), Play (games),
 * Dashboard (pulse) — without re-bloating the newcomer path. Renders nothing
 * until a holding wallet is present.
 */
export function HeaderHolderLinks() {
  const h = useHolder();
  if (h.loading || !h.address || !h.isHolder) return null;
  return (
    <>
      <Link href="/my-citizens" className="nav-link nav-holder">My Citizens</Link>
      <Link href="/play" className="nav-link nav-holder">Play</Link>
      <Link href="/dashboard" className="nav-link nav-holder">Dashboard</Link>
    </>
  );
}

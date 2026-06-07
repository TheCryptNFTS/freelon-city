"use client";

import Link from "next/link";
import { useHolder } from "@/lib/useHolder";

/**
 * Header "See an Agent" CTA — viewer-aware so it never dead-ends on the same
 * citizen #1 for everyone. A connected holder is sent to THEIR agents (their
 * wallet gallery, "YOUR CITIZENS · RUN AN AGENT"); everyone else lands on the
 * agent gallery (/citizens), which carries the smart top-trained "SEE AN AGENT"
 * CTA + the TopAgents rail. Kept client-only (the holder check is client) so the
 * server Header stays static and doesn't deopt every page to dynamic.
 */
export function HeaderSeeAgent() {
  const { isHolder, address } = useHolder();
  const holder = isHolder && address;
  return (
    <Link
      href={holder ? `/wallet/${address}` : "/citizens"}
      className="btn btn-primary btn-sm nav-sync"
    >
      {holder ? "Your Agents" : "See an Agent"}
    </Link>
  );
}

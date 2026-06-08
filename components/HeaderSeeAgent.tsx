"use client";

import Link from "next/link";
import { useHolder } from "@/lib/useHolder";

/**
 * Header "See an Agent" CTA — viewer-aware so it never dead-ends on the same
 * citizen #1 for everyone. A connected holder is sent to THEIR agents (their
 * wallet gallery, "YOUR CITIZENS · RUN AN AGENT"); everyone else lands on the
 * FREE public demo (/demo) where they can actually talk to a live agent before
 * owning one. Kept client-only (the holder check is client) so the
 * server Header stays static and doesn't deopt every page to dynamic.
 */
export function HeaderSeeAgent() {
  const { isHolder, address } = useHolder();
  const holder = isHolder && address;
  return (
    <Link
      href={holder ? `/wallet/${address}` : "/demo"}
      className="btn btn-primary btn-sm nav-sync"
    >
      {holder ? "Your Agents" : "See an Agent"}
    </Link>
  );
}

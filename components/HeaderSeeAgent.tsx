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
  // Holders already reach their agents three other ways (the "165 CITIZENS →"
  // wallet badge deep-links to /wallet, plus My Citizens + Dashboard in the
  // holder nav). Dropping the redundant primary button here is what keeps the
  // connected-holder header from overflowing at desktop width. Cold visitors —
  // the priority user — still get the demo CTA. 2026-06-09. Label moved to
  // citizen-noun canon 2026-06-10 ("agent" is never the primary noun cold).
  if (holder) return null;
  return (
    <Link href="/demo" className="btn btn-primary btn-sm nav-sync">
      Meet a Citizen
    </Link>
  );
}

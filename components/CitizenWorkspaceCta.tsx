"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useViewerAddr } from "@/lib/use-viewer";
import { trackEvent } from "@/lib/track";

/**
 * Ownership-aware primary CTA for the citizen profile (upgrade audit #5, 2026-06-19).
 *
 * The old server CTA promised "Open the workspace · chat like ChatGPT" to every
 * visitor, but a non-owner clicking it lands on the LOCKED pay panel — an
 * expectation/reality whiplash on 4,040 indexed, most-shared pages. We default to
 * the honest AWAKEN copy (SSR + non-owners, the larger population) and upgrade to
 * "Open the workspace" only once we confirm the viewer owns THIS token. The link
 * is /agent/[tid] either way — it renders the workspace for owners and the unlock
 * panel for everyone else, so the destination now matches the label.
 */
export function CitizenWorkspaceCta({ tid, color }: { tid: number; color: string }) {
  const viewer = useViewerAddr();
  const [owns, setOwns] = useState(false);

  useEffect(() => {
    if (!viewer.ready || !viewer.addr) return;
    let cancelled = false;
    fetch(`/api/wallet/${viewer.addr}/tokens`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d || !Array.isArray(d.tokenIds)) return;
        setOwns(d.tokenIds.includes(tid));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [viewer.ready, viewer.addr, tid]);

  return (
    <Link
      href={`/agent/${tid}`}
      className="workspace-open-cta"
      style={{ ["--accent" as string]: color }}
      onClick={() => trackEvent("workspace_open", { from: "citizen_pdp", owns })}
    >
      <span className="wo-kicker">{owns ? "YOUR AGENT WORKSPACE" : "AWAKEN THIS FREELON"}</span>
      <span className="wo-title">{owns ? "Open the workspace →" : "Awaken this FREELON →"}</span>
      <span className="wo-sub">
        {owns
          ? "Chat, generate, and build a permanent work history — all in one place, like opening ChatGPT or Claude."
          : "Own it to chat, generate images, and build its permanent work history — like your own ChatGPT, and it stays with the NFT."}
      </span>
    </Link>
  );
}

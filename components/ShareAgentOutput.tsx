"use client";

/**
 * ShareAgentOutput — a small "Share this →" button that turns an agent result
 * into a one-tap X post. Opens an X intent pre-filled with plain copy plus a
 * link to the citizen page (which unfurls the /api/og/agent card).
 *
 * Self-contained: NOT wired into the dashboard here — drop it next to any agent
 * output and pass the citizen + ability.
 */

import type { CSSProperties } from "react";
import { buildAgentShareIntent } from "@/lib/share-agent";

export type ShareAgentOutputProps = {
  tokenId: number;
  citizenName: string;
  /** e.g. "RED TEAM", "CONTENT AGENT" — what the agent does. */
  abilityLabel: string;
  /** Optional history index to deep-link the exact output shared. */
  workIndex?: number;
  className?: string;
};

export default function ShareAgentOutput({
  tokenId,
  citizenName,
  abilityLabel,
  workIndex,
  className,
}: ShareAgentOutputProps) {
  function share() {
    const url = buildAgentShareIntent({ tokenId, citizenName, abilityLabel, workIndex });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // When a className is supplied (e.g. the dashboard's `.agentdash-outbtn`),
  // defer entirely to it so the button matches the row it sits in. The inline
  // style is only a self-contained fallback for drop-anywhere use.
  const fallbackStyle: CSSProperties | undefined = className
    ? undefined
    : {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: "transparent",
        border: "1px solid #C8A75D",
        borderRadius: 8,
        color: "#C8A75D",
        fontFamily: "monospace",
        fontSize: 14,
        letterSpacing: 1,
        cursor: "pointer",
      };

  return (
    <button
      type="button"
      onClick={share}
      className={className}
      aria-label="Share this agent output on X"
      style={fallbackStyle}
    >
      <span aria-hidden>⬡</span>
      Share this →
    </button>
  );
}

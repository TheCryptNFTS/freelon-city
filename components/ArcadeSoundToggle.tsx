"use client";

import { useEffect, useState } from "react";
import { isMuted, toggleMuted, cue } from "@/lib/arcade-feedback";

/**
 * A tiny sound on/off control shared by the arcade games. Mirrors the persisted
 * mute pref from lib/arcade-feedback so every game shows the same state. Plays a
 * short cue when un-muting so the player hears that it worked (and so the first
 * gesture unlocks the AudioContext).
 */
export function ArcadeSoundToggle({ style }: { style?: React.CSSProperties }) {
  const [mounted, setMounted] = useState(false);
  const [on, setOn] = useState(true);

  useEffect(() => {
    setMounted(true);
    setOn(!isMuted());
  }, []);

  const handle = () => {
    const nowMuted = toggleMuted();
    setOn(!nowMuted);
    if (!nowMuted) cue("tap");
  };

  // Render a stable label pre-mount to avoid a hydration mismatch.
  const label = !mounted ? "SOUND ON" : on ? "SOUND ON" : "SOUND OFF";

  return (
    <button
      onClick={handle}
      aria-pressed={mounted ? on : true}
      aria-label={on ? "Mute sound" : "Unmute sound"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: on ? "var(--neon-cyan)" : "var(--ink-fade)",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 6,
        padding: "6px 11px",
        cursor: "pointer",
        transition: "color .12s, border-color .12s",
        ...style,
      }}
    >
      <span aria-hidden style={{ fontSize: 12, opacity: on ? 1 : 0.5 }}>⬡</span>
      {label}
    </button>
  );
}

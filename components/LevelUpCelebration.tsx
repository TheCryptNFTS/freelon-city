"use client";

import { useEffect, useMemo } from "react";

/**
 * LEVEL-UP CELEBRATION — a brief confetti + card moment when a citizen levels up
 * in the workspace. Dependency-free (CSS confetti), auto-dismisses, and offers a
 * one-tap share so the milestone feeds the social loop. Reduced-motion safe.
 *
 * Purely a UX celebration — it does NOT grant anything. (A HEX reward on level-up
 * would be an economy/faucet change and is intentionally left to that decision.)
 */
export function LevelUpCelebration({
  level,
  name,
  tokenId,
  accent,
  onClose,
}: {
  level: number;
  name: string;
  tokenId: number;
  accent: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Respect reduced-motion: the confetti animates via inline styles the global
  // @media block can't reach, so we skip the layer entirely when reduced.
  const prefersReduced = useMemo(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Pre-computed confetti pieces (stable per mount).
  const pieces = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 1.8 + Math.random() * 1.6,
        rot: Math.random() * 360,
        color: [accent, "#E9C984", "#f2efe6", "#C8A75D"][i % 4],
        w: 6 + Math.random() * 6,
        h: 9 + Math.random() * 8,
      })),
    [accent],
  );

  const shareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${name} just reached LEVEL ${level} in FREELON CITY ⬡\n\nMy NFT is a trained AI agent that levels up as I use it.\nfreeloncity.com/agent/${tokenId}`,
  )}`;

  return (
    <div
      role="dialog"
      aria-label={`${name} reached level ${level}`}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,6,9,0.55)", backdropFilter: "blur(2px)" }}
    >
      {/* confetti layer — skipped under prefers-reduced-motion */}
      <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {!prefersReduced && pieces.map((p, i) => (
          <span
            key={i}
            style={{
              position: "absolute", top: "-5%", left: `${p.left}%`, width: p.w, height: p.h,
              background: p.color, borderRadius: 1, opacity: 0.9,
              transform: `rotate(${p.rot}deg)`,
              animation: `lvlfall ${p.dur}s ${p.delay}s cubic-bezier(0.4,0,0.7,1) forwards`,
            }}
          />
        ))}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", zIndex: 1, maxWidth: 380, width: "86%", padding: "26px 24px",
          textAlign: "center", borderRadius: 18,
          border: `1px solid color-mix(in srgb, ${accent} 60%, transparent)`,
          background: `linear-gradient(160deg, color-mix(in srgb, ${accent} 16%, #0c0b10), #0c0b10)`,
          boxShadow: `0 24px 70px -20px rgba(0,0,0,0.8), 0 0 50px -10px color-mix(in srgb, ${accent} 45%, transparent)`,
        }}
      >
        <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>⬡ Level Up</div>
        <div style={{ fontFamily: "var(--display)", fontSize: 64, lineHeight: 1, color: accent, margin: "10px 0 4px", filter: `drop-shadow(0 0 14px color-mix(in srgb, ${accent} 55%, transparent))` }}>{level}</div>
        <div style={{ fontFamily: "var(--display)", fontSize: 20, color: "#f2efe6" }}>{name} grew stronger</div>
        <p style={{ fontSize: 12.5, color: "var(--ink-2, #b8b8c0)", lineHeight: 1.5, margin: "8px 0 0" }}>
          Every job you run trains it. Higher levels reason deeper and unlock more — and it all stays with the NFT.
        </p>
        <a
          href={shareHref} target="_blank" rel="noreferrer"
          style={{ display: "block", marginTop: 16, padding: "11px 16px", borderRadius: 10, background: accent, color: "#0a0a0c", fontFamily: "var(--mono2)", fontWeight: 700, fontSize: 12.5, letterSpacing: "0.04em", textDecoration: "none" }}
        >
          SHARE THIS MILESTONE ↗
        </a>
        <button type="button" onClick={onClose} style={{ marginTop: 8, background: "transparent", border: "none", color: "var(--ink-dim, #8a8a92)", fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.1em", cursor: "pointer" }}>DISMISS</button>
      </div>

      <style>{`
        @keyframes lvlfall { to { transform: translateY(110vh) rotate(720deg); opacity: 0.2; } }
        @media (prefers-reduced-motion: reduce) { [aria-hidden] span { animation: none !important; display: none; } }
      `}</style>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A shared first-run tutorial overlay for the arcade games. Auto-opens once per
 * game (a "seen" flag in localStorage), and also exposes a persistent
 * "HOW TO PLAY" trigger so a player can re-read the rules any time. Purely
 * local — no server, no economy. Motion is gated by prefers-reduced-motion.
 *
 * Each step is a short rule with an optional brand glyph; the copy stays terse
 * and visual so the overlay reads in a couple of seconds and gets out of the
 * way.
 */

export type TutorialStep = { glyph?: string; text: string };

const KEY_PREFIX = "freelon::play::tutorial::v1::";

export function ArcadeTutorial({
  game,
  title,
  steps,
  accent = "var(--neon-cyan)",
  triggerStyle,
}: {
  game: string;
  title: string;
  steps: TutorialStep[];
  accent?: string;
  triggerStyle?: React.CSSProperties;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setReduce(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    } catch {
      /* matchMedia unavailable — assume motion is fine */
    }
    try {
      if (!window.localStorage.getItem(KEY_PREFIX + game)) setOpen(true);
    } catch {
      /* storage blocked — just don't auto-open */
    }
  }, [game]);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(KEY_PREFIX + game, "1");
    } catch {
      /* best-effort — overlay will simply re-open next visit */
    }
  }, [game]);

  if (!mounted) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ink-dim)",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: "6px 11px",
          cursor: "pointer",
          transition: "color .12s, border-color .12s",
          ...triggerStyle,
        }}
      >
        <span aria-hidden style={{ fontSize: 12 }}>⬡</span>
        HOW TO PLAY
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — how to play`}
          onClick={dismiss}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(4, 6, 18, 0.82)",
            backdropFilter: "blur(3px)",
            animation: reduce ? undefined : "arc-tut-fade .2s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(440px, 100%)",
              border: "1px solid var(--line)",
              borderTop: `2px solid ${accent}`,
              background: "var(--bg-2)",
              padding: "26px 26px 24px",
              animation: reduce ? undefined : "arc-tut-rise .24s ease-out",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.28em",
                color: accent,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              ⬡ HOW TO PLAY
            </div>
            <div
              style={{
                fontFamily: "var(--display)",
                fontSize: 28,
                lineHeight: 1.05,
                color: "var(--ink)",
                marginBottom: 18,
              }}
            >
              {title}
            </div>

            <ol
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gap: 14,
              }}
            >
              {steps.map((s, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      flex: "none",
                      width: 26,
                      height: 26,
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--mono)",
                      fontSize: s.glyph ? 14 : 11,
                      color: accent,
                      border: `1px solid ${accent}`,
                      borderRadius: 6,
                      opacity: 0.9,
                    }}
                  >
                    {s.glyph ?? i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--ink-dim)",
                    }}
                  >
                    {s.text}
                  </span>
                </li>
              ))}
            </ol>

            <button
              onClick={dismiss}
              style={{
                marginTop: 22,
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: 12,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#0a0e27",
                background: accent,
                border: "none",
                borderRadius: 6,
                padding: "12px",
                cursor: "pointer",
              }}
            >
              GOT IT →
            </button>
          </div>

          <style>{`
            @keyframes arc-tut-fade { from { opacity: 0 } to { opacity: 1 } }
            @keyframes arc-tut-rise {
              from { opacity: 0; transform: translateY(10px) }
              to { opacity: 1; transform: translateY(0) }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

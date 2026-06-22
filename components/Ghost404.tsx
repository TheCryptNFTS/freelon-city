"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { markGhost404 } from "@/lib/secrets-store";

// EASTER EGG 3 — between 04:04 and 04:05 UTC every day, a "ghost transmission"
// from VOID 404 surfaces on every page. Click-through unlocks the fifth bracket.
// Outside that window: invisible, costs nothing.
export function Ghost404() {
  const [visible, setVisible] = useState(false);
  // Day-keyed dismissal so a fresh UTC day resurfaces the ghost
  const closedDayRef = useRef<string | null>(null);
  const [closedDay, setClosedDay] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const h = now.getUTCHours();
      const m = now.getUTCMinutes();
      const today = now.toISOString().slice(0, 10);
      const open = h === 4 && m === 4;
      const dismissedToday = closedDayRef.current === today;
      if (open && !dismissedToday) {
        if (!visible) {
          setVisible(true);
          try { markGhost404(); } catch {}
        }
      } else if ((!open || dismissedToday) && visible) {
        setVisible(false);
      }
    };
    check();
    const t = setInterval(check, 2000);
    return () => clearInterval(t);
  }, [visible, closedDay]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 998,
        maxWidth: 320,
        background: "rgba(12,11,8,0.96)",
        border: "1px solid rgba(200,167,93,0.32)",
        padding: "14px 16px",
        boxShadow: "0 8px 28px rgba(0,0,0,0.6)",
        animation: "ghost404-in 0.6s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.28em", color: "#b8a888" }}>
          ⬡ 04:04 UTC · GHOST TRANSMISSION
        </span>
        <button
          onClick={() => {
            const today = new Date().toISOString().slice(0, 10);
            closedDayRef.current = today;
            setClosedDay(today);
            setVisible(false);
          }}
          aria-label="Dismiss"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ink-2)",
            cursor: "pointer",
            fontFamily: "var(--mono2)",
            fontSize: 12,
          }}
        >✕</button>
      </div>
      <div style={{ marginTop: 10, fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.04em", color: "var(--ink)", lineHeight: 1.55 }}>
        The fifth bracket is open for one minute.
      </div>
      <Link
        href="/the-fifth-bracket"
        style={{
          display: "inline-block",
          marginTop: 10,
          fontFamily: "var(--mono2)",
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "#c8aa64",
        }}
      >ENTER →</Link>
      <style>{`
        @keyframes ghost404-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

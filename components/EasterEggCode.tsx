"use client";
import { useEffect, useState } from "react";
import { markCode0404 } from "@/lib/secrets-store";

// Listens for the sequence "0404" typed anywhere on the site.
// When triggered, fires a brief on-screen transmission overlay and persists
// the discovery in localStorage. Safe for SSR — only attaches in the browser.
export function EasterEggCode() {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let buf = "";
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing into inputs / textareas / contenteditable
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = (t.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable) return;
      }
      if (e.key < "0" || e.key > "9") return;
      buf = (buf + e.key).slice(-4);

      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { buf = ""; }, 1500);

      if (buf === "0404") {
        buf = "";
        markCode0404();
        setFlash(true);
        try {
          if (typeof window !== "undefined" && (window as unknown as { plausible?: (e: string) => void }).plausible) {
            (window as unknown as { plausible?: (e: string) => void }).plausible!("Easter Egg 0404");
          }
        } catch {}
        // Auto-hide
        setTimeout(() => setFlash(false), 4400);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, []);

  if (!flash) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        pointerEvents: "none",
        display: "grid",
        placeItems: "center",
        background: "rgba(8,9,14,0.78)",
        backdropFilter: "blur(6px)",
        animation: "egg404-in 0.3s ease",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "32px 44px",
          border: "1px solid #c8aa64",
          background: "rgba(20,22,30,0.94)",
          maxWidth: 520,
        }}
      >
        <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.28em", color: "#c8aa64", marginBottom: 14 }}>
          ⬡ HEX 0404 · ACK
        </div>
        <div style={{ fontFamily: "var(--mono2)", fontSize: 14, letterSpacing: "0.06em", color: "var(--ink)", lineHeight: 1.5, marginBottom: 14 }}>
          THE PAGE WAS THE MESSAGE.<br />
          VOID 404 SEES YOU.
        </div>
        <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.24em", color: "var(--ink-2)" }}>
          /SECRETS · ONE OF FIVE
        </div>
      </div>
      <style>{`
        @keyframes egg404-in {
          from { opacity: 0; transform: scale(0.985); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

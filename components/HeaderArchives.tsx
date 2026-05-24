"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Archives dropdown — grouped, not a flat dump of 17 unrelated routes.
 *
 * Lore pages (Origin / Lore / Shapes / Castes / Manifesto / Rebuild /
 * Lexicon) all collapse into a single Canon link — they're individually
 * reachable but the consolidated reference library is the better entry.
 *
 * Remaining items live under four small headers so the eye groups them
 * by intent: CANON · PLAY · MARKET · COMMUNITY.
 */
type Item = { href: string; label: string; gold?: boolean };
type Group = { heading: string; items: Item[] };

const GROUPS: Group[] = [
  {
    heading: "CANON",
    items: [
      { href: "/canon", label: "All reference · Origin · Civs · Castes · Shapes · Lexicon · Manifesto", gold: true },
    ],
  },
  {
    heading: "PLAY",
    items: [
      { href: "/civ-wars",      label: "⬡ Civ Wars",      gold: true },
      { href: "/transmissions", label: "⬡ Transmissions", gold: true },
      { href: "/relay",         label: "⬡ Relay (Post)",  gold: true },
      { href: "/secrets",       label: "⬡ Secrets",       gold: true },
    ],
  },
  {
    heading: "MARKET",
    items: [
      { href: "/heat",        label: "Heat" },
      { href: "/undervalued", label: "Undervalued" },
      { href: "/graveyard",   label: "Graveyard" },
    ],
  },
  {
    heading: "COMMUNITY",
    items: [
      { href: "/tribute", label: "Tribute · 35 honoraries" },
      { href: "/names",   label: "Hall of Names" },
      { href: "/pfp",     label: "PFP Studio" },
    ],
  },
];

export function HeaderArchives() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute fixed-position coordinates from trigger's bounding rect when opening.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function compute() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Anchor menu's top-right to trigger's bottom-right, with a small gap.
      const top = r.bottom + 14;
      const right = Math.max(8, window.innerWidth - r.right);
      setPos({ top, right });
    }
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="nav-more" style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        className="nav-link nav-more-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Archives ▾
      </button>
      {mounted && open && pos && createPortal(
        <div
          ref={menuRef}
          className="nav-more-menu-portal"
          role="menu"
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            minWidth: 280,
            maxWidth: 360,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            padding: "6px 0 10px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 12px 40px -12px rgba(0,0,0,0.6)",
            zIndex: 10000,
          }}
        >
          {GROUPS.map((g, gi) => (
            <div key={g.heading}>
              {gi > 0 && (
                <div
                  aria-hidden
                  style={{
                    height: 1,
                    background: "var(--line)",
                    margin: "6px 14px",
                    opacity: 0.6,
                  }}
                />
              )}
              <div
                style={{
                  padding: "10px 18px 4px",
                  fontFamily: "var(--mono2)",
                  fontSize: 9,
                  letterSpacing: "0.32em",
                  color: "var(--ink-dim)",
                  textTransform: "uppercase",
                }}
              >
                ⬡ {g.heading}
              </div>
              {g.items.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "8px 18px",
                    fontFamily: "var(--mono2)",
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: l.gold ? "var(--gold)" : "var(--ink-2)",
                    textDecoration: "none",
                    lineHeight: 1.4,
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

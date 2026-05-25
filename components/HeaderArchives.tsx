"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Archives dropdown — grouped by intent (LIVE / MARKET / HOLDER /
 * COMMUNITY / CANON) instead of a flat dump.
 *
 * All visual rules live in the .nav-archives-* classes below — no
 * inline styles. The component owns: positioning math, open/close,
 * group data.
 */
type Item = { href: string; label: string; gold?: boolean };
type Group = { heading: string; items: Item[] };

// Route compression 2026-05-25 — More dropdown reduced from 5 groups
// × 15 items → flat list of 6. The grouped LIVE/MARKET/HOLDER/
// COMMUNITY/CANON taxonomy was scaffolding for a sprawl that no
// longer exists in nav. Each remaining link is one of: canonical
// reference (Canon), discovery/social proof (Tribute, Transmissions),
// holder safeguard (Vault), public stats (Pulse), or onboarding
// (Start). Everything else moved out of nav — pages still reachable
// by direct URL.
const GROUPS: Group[] = [
  {
    heading: "",
    items: [
      { href: "/canon",         label: "Canon" },
      { href: "/tribute",       label: "Tribute" },
      { href: "/numbers",       label: "Pulse" },
      { href: "/vault",         label: "⬡ Vault", gold: true },
      { href: "/transmissions", label: "Transmissions" },
      { href: "/start",         label: "Start Here · 2-min guide" },
    ],
  },
];

export function HeaderArchives() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function compute() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
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
    <div className="nav-more nav-archives">
      <button
        ref={triggerRef}
        type="button"
        className="nav-link nav-more-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        More ▾
      </button>
      {mounted && open && pos && createPortal(
        <div
          ref={menuRef}
          className="nav-archives-menu"
          role="menu"
          style={{ top: pos.top, right: pos.right }}
        >
          {GROUPS.map((g, gi) => (
            <div key={g.heading || gi} className="nav-archives-group">
              {gi > 0 && <div aria-hidden className="nav-archives-divider" />}
              {g.heading && <div className="nav-archives-heading">{g.heading}</div>}
              {g.items.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`nav-archives-item${l.gold ? " nav-archives-item--gold" : ""}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>,
        document.body,
      )}
      <style>{`
        .nav-archives { position: relative; }
        .nav-archives-menu {
          position: fixed;
          width: 240px;
          max-width: calc(100vw - 16px);
          background: var(--surface);
          border: 1px solid var(--line);
          padding: 8px 0 12px;
          box-shadow: var(--sh-1);
          z-index: 10000;
          border-radius: var(--r-2);
        }
        .nav-archives-group { display: block; }
        .nav-archives-divider {
          height: 1px;
          background: var(--line);
          margin: 8px 16px;
          opacity: 0.5;
        }
        .nav-archives-heading {
          padding: 8px 16px 4px;
          font-family: var(--mono2);
          font-size: var(--t-mono-xxs);
          letter-spacing: var(--tr-mono);
          color: var(--ink-dim);
          text-transform: uppercase;
        }
        .nav-archives-item {
          display: block;
          padding: 7px 16px;
          font-family: var(--mono2);
          font-size: var(--t-mono-sm);
          letter-spacing: var(--tr-loose);
          text-transform: uppercase;
          color: var(--ink-2);
          text-decoration: none;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nav-archives-item:hover { color: var(--gold-bright); background: var(--tint-gold); }
        .nav-archives-item--gold { color: var(--gold); }
      `}</style>
    </div>
  );
}

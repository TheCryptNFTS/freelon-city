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
// × 15 items → flat list. 2026-05-26 community feedback (Nonz):
// /carrier and /secrets had been hidden from nav entirely, making
// holder utility (Carrier) hard to find and an on-canon lore page
// (Secrets) impossible to reach on laptop. Restored to the dropdown
// only — NOT to top nav, NOT as an EARN HEX header pill (deliberate
// decision to kill the utility-token tell). Each remaining link is
// canonical reference, discovery/social proof, holder safeguard,
// public stats, holder utility, lore-fit, or onboarding.
// 2026-05-28 collector pass ("lean in"): the collector red-team flagged
// holder tools (Dashboard/Vault/Earn/Leaderboard) as buried in a flat
// 13-item dump. Re-grouped into labelled sections with HOLDER tools first
// so a collector/holder finds their surfaces immediately. Same 13 routes,
// now scannable. (The component already renders headings + dividers.)
// 2026-05-31 — Play, New-here and Citizens promoted to top-level nav
// (Discord: games + onboarding were the engaged surfaces but were
// buried here). Combat Archives + Shop moved IN from top nav. Long
// tail now grouped Holder / City / Lore. The /combat-archives page
// itself is untouched — only its nav placement changed.
const GROUPS: Group[] = [
  // 2026-05-31 GREAT CONSOLIDATION — the dropdown now lists ONLY the
  // surviving hubs. ~28 thin pages were folded into a handful of tabbed
  // hubs (e.g. signal/vault/carrier → /sync; leaderboard/numbers → /dashboard;
  // relay → /earn; secrets → /canon) and 308-redirected (next.config.ts), so
  // the former dropdown entries for those routes were removed — they're now
  // sections (#anchors) inside hubs already listed here. "Your wallet" now
  // points at the /sync hub. Top nav (Start/Play/Citizens + Own) unchanged.
  {
    heading: "Explore",
    items: [
      { href: "/collections",   label: "Collections" },     // on-site explorers for every collection
      { href: "/civilizations", label: "Civilizations" },
      { href: "/archive",       label: "Archive" },
      { href: "/sync",          label: "Your wallet" },     // /signal etc. folded into the /sync hub
    ],
  },
  {
    heading: "Holder",
    items: [
      { href: "/dashboard",     label: "Dashboard" },       // absorbs stats / leaderboard / heat / snipes / civ-wars
      { href: "/earn",          label: "Earn" },            // absorbs share-to-earn + the bid-wall mission
    ],
  },
  {
    heading: "City",
    items: [
      { href: "/combat-archives", label: "Combat Archives" },
      { href: "/shop",            label: "Shop" },
      { href: "/transmissions",   label: "Community" },     // community posting wall
    ],
  },
  {
    heading: "Lore",
    items: [
      { href: "/canon",         label: "Canon" },           // absorbs lexicon / names / secrets / roadmap
      { href: "/tribute",       label: "Honorees" },        // absorbs patrons + the architect bio
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
    const FOCUSABLE =
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const menu = menuRef.current;
      if (!menu) return;
      const items = Array.from(
        menu.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !menu.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    // Move focus into the menu when it opens.
    const menu = menuRef.current;
    const firstFocusable = menu?.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      // Return focus to the trigger when the menu closes.
      triggerRef.current?.focus();
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

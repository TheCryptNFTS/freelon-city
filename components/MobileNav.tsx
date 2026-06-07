"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Route compression 2026-05-25 — mobile nav reduced from 33 links to
// 11. 2026-05-26 community feedback (Nonz): "easier to see everything
// on laptop." Desktop has visual hierarchy (4 horizontal nav items +
// dropdown groups them by intent); mobile was one flat vertical list
// of 11. Grouping the sheet into 4 labelled sections (ENTER · CITY ·
// DEEPER · HOLDER) gives mobile the same scannability the laptop nav
// has implicitly. Same routes, same order family, just labelled.
//
// Also restoring /citizens to the mobile nav — was added to the
// desktop More dropdown earlier today (f393ca7) but the matching
// mobile entry was missed.

type NavLink = { href: string; label: string; gold?: boolean };
type NavGroup = { heading: string | null; links: NavLink[] };

// 2026-05-31 — mobile sheet rebuilt to MIRROR the desktop nav exactly
// (Header.tsx top items + HeaderArchives More groups). Previously the two
// navs had drifted into different groupings/labels. Top block now leads
// with the newcomer's path (New? · Play) the same way the laptop nav
// does; Combat Archives + Shop live under CITY. One source of truth in
// spirit — edit both files together when the IA changes.
const GROUPS: NavGroup[] = [
  {
    heading: null,                                          // primary CTA, ungrouped
    links: [
      // 2026-06-06 dedup — primary mirrors desktop + hero: SEE AN AGENT (try
      // first). Own a Freelon is the secondary just below (still one tap away).
      { href: "/citizens/1", label: "⬡ SEE AN AGENT", gold: true },
      { href: "https://opensea.io/collection/freelons", label: "Own a Freelon" },
    ],
  },
  {
    heading: null,                                          // top-nav parity block — AGENTS-FIRST
    links: [
      { href: "/citizens",  label: "FREELONS", gold: true },
      { href: "/earn",      label: "Earn HEX" },
    ],
  },
  // 2026-06-06 EXPLORE de-sprawl — mirrors the trimmed HeaderArchives "Explore ▾"
  // dropdown (12→10 items, 4→3 groups). Dropped "Connect wallet" (/sync —
  // redundant with the wallet button; page still linked from ~20 surfaces);
  // folded "branches" into "The city"; Crypt TCG demoted to last with a "· soon"
  // cue (reconstruction-unstable placeholder); /archive moved into Lore. Keep in
  // sync with HeaderArchives.tsx (one IA, two renderers).
  {
    heading: "GET STARTED",
    links: [
      { href: "/start",     label: "New here? Start" },
      { href: "/play",      label: "Play" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    heading: "THE CITY",
    links: [
      { href: "/collections",   label: "Collections" },
      { href: "/transmissions", label: "Community wall" },
      { href: "/shop",          label: "Shop" },
    ],
  },
  {
    heading: "LORE",
    links: [
      { href: "/canon",     label: "Story & glossary" },
    ],
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Portal target only available after mount (avoids SSR mismatch)
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const FOCUSABLE =
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const nav = navRef.current;
      if (!nav) return;
      const items = Array.from(nav.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !nav.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    // Move focus into the sheet when it opens.
    const firstFocusable =
      navRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      // Return focus to the trigger when the sheet closes.
      triggerRef.current?.focus();
    };
  }, [open]);

  const sheet = (
    <div
      className={`mobile-sheet ${open ? "open" : ""}`}
      onClick={() => setOpen(false)}
      aria-hidden={!open}
    >
      <nav ref={navRef} onClick={(e) => e.stopPropagation()}>
        <span className="kicker">⬡ FREELON CITY · NAVIGATION</span>
        {GROUPS.map((g, gi) => (
          <div key={g.heading ?? `g${gi}`} className="mobile-sheet__group">
            {g.heading && (
              <div className="mobile-sheet__groupHeading">{g.heading}</div>
            )}
            <ul>
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    style={l.gold ? { color: "var(--gold)" } : undefined}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="sheet-footer">
          <span>Cycle 0404 · Locked on Ethereum</span>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`mobile-trigger ${open ? "open" : ""}`}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mt-glyph">{open ? "✕" : "⬡"}</span>
        <span className="mt-label">{open ? "CLOSE" : "MENU"}</span>
      </button>
      {/* Portal the sheet to document.body so it escapes the header's
          backdrop-filter containing block. Without this, position: fixed
          gets trapped inside the 72px-tall header. */}
      {mounted && createPortal(sheet, document.body)}
    </>
  );
}

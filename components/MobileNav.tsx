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
// (Header.tsx top items; the old HeaderArchives "More" dropdown was deleted
// 2026-06-10 — dead chrome, imported nowhere). Previously the two
// navs had drifted into different groupings/labels. Top block now leads
// with the newcomer's path (New? · Play) the same way the laptop nav
// does; Combat Archives + Shop live under CITY. One source of truth in
// spirit — edit both files together when the IA changes.
// 2026-06-08 RADICAL CONDENSE (founder: "drop the 45 pages, keep it really
// simple") — the mobile sheet is now the spine only, mirroring the trimmed
// desktop nav. Cut from 5 groups → 2: the free hook + buy, then the product +
// collections + onboarding. Earn HEX, Play, Community wall, Shop, Lore were
// pulled from the sheet (pages still exist by URL, off the newcomer's path).
// 2026-06-11 REEGS PASS (holder UX feedback + founder approval): the sheet had
// THREE near-identical FREELON doors stacked (MEET A CITIZEN / OWN A FREELON /
// FREELONS) — word soup to a newcomer — plus an empty ghost row between the
// two heading-less groups. Rebuilt per Reegs: categorized, no word twice,
// buttons not text rows ("menu leads to everything categorized · no slippage
// between categories · people don't want to see things twice").
// 2026-06-29 SITE-DESIGN REBUILD: the sheet is now the four canonical groups,
// matching the rebuilt footer and the product hierarchy exactly — Play / City /
// Own / Support. The three free product doors lead (mirroring the desktop
// launcher nav + homepage cards); City is the directory; Own is the buy +
// account links; Support is help + policies + community. One source of truth
// with the footer — edit both files together when the IA changes.
// 2026-07-02 WAR-ROOM ALIGNMENT: the sheet still sold the retired 2026-06-29
// games-first hierarchy (three gold PLAY doors on top) while the 07-01 desktop
// header re-sequenced the whole site around ONE thesis (MEET FREE first, games
// demoted to proof/funnel). The two navs contradicted each other on the exact
// audience that matters most (mobile cold traffic). Sheet now mirrors the
// thesis funnel: Meet free (gold) + the /start path lead; games follow.
// Also fixes two audit findings: /start had NO inbound link anywhere on
// mobile, and /live was a bottom-nav tab unreachable from this sheet.
const GROUPS: NavGroup[] = [
  {
    heading: "MEET · FREE",
    links: [
      { href: "/demo", label: "Meet an AI citizen", gold: true },
      { href: "/start", label: "New? The five-step path" },
    ],
  },
  {
    heading: "PLAY",
    links: [
      { href: "/mars-command", label: "Enter Mars" },
      { href: "/crypt-tcg", label: "Play the TCG" },
      { href: "/play", label: "All games" },
    ],
  },
  {
    heading: "CITY",
    links: [
      { href: "/live", label: "Happening now · Live" },
      { href: "/citizens", label: "Browse the 4,040" },
      { href: "/collections", label: "The six collections" },
      { href: "/civilizations", label: "Ten civilizations" },
      { href: "/archive", label: "The Archive" },
    ],
  },
  {
    heading: "OWN",
    links: [
      { href: "https://opensea.io/collection/freelons", label: "Own a FREELON ↗" },
      { href: "/my-citizens", label: "My Citizens" },
      { href: "/dashboard", label: "Dashboard" },
      // 2026-06-11 Discord (Damien hunted 20+ min for "where to link my X"):
      // the most-asked account action keeps a permanent door. /sync hosts the
      // full wallet+X flow on every viewport.
      { href: "/sync", label: "Connect wallet + X" },
    ],
  },
  {
    heading: "SUPPORT",
    links: [
      { href: "/help", label: "New here? Start at Help" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "https://discord.gg/xcK3E8nCB8", label: "Discord ↗" },
    ],
  },
];

export function MobileNav() {
  const groups = GROUPS;
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
        {groups.map((g, gi) => (
          <div key={g.heading ?? `g${gi}`} className="mobile-sheet__group">
            {g.heading && (
              <div className="mobile-sheet__groupHeading">{g.heading}</div>
            )}
            <ul>
              {g.links.map((l) => (
                <li key={l.href}>
                  {/* 2026-07-02: external links open in a new tab like their
                      Footer/Header twins — the sheet used to same-tab users
                      off the site via next/link. */}
                  {l.href.startsWith("http") ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setOpen(false)}
                      style={l.gold ? { color: "var(--gold)" } : undefined}
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      style={l.gold ? { color: "var(--gold)" } : undefined}
                    >
                      {l.label}
                    </Link>
                  )}
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

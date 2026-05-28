"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
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

const GROUPS: NavGroup[] = [
  {
    heading: null,                                          // primary CTA, ungrouped
    links: [
      { href: "/sync", label: "⬡ ENTER THE CITY", gold: true },
    ],
  },
  {
    heading: "CITY",
    links: [
      { href: "/archive",         label: "Archive" },
      { href: "/civilizations",   label: "Civilizations" },
      { href: "/combat-archives", label: "Combat Archives" },
      { href: "/shop",            label: "Shop" },
    ],
  },
  {
    heading: "DEEPER",
    links: [
      { href: "/canon",         label: "Canon" },
      { href: "/tribute",       label: "Tribute" },
      { href: "/citizens",      label: "Citizens" },
      { href: "/numbers",       label: "Pulse" },
    ],
  },
  {
    heading: "HOLDER",
    links: [
      // 2026-05-28 mobile parity: dashboard/earn/leaderboard were added to
      // the desktop More dropdown (HeaderArchives) by the nav-funnel pass
      // but the matching mobile entries were missed. Added here so the
      // sheet exposes the same post-sync surfaces the laptop nav does.
      { href: "/dashboard",     label: "Dashboard" },
      { href: "/vault",         label: "⬡ Vault", gold: true },
      { href: "/transmissions", label: "Transmissions" },
      { href: "/relay",         label: "Relay" },
      { href: "/earn",          label: "Earn" },
      { href: "/leaderboard",   label: "Leaderboard" },
    ],
  },
  {
    heading: "NEW HERE?",
    links: [
      { href: "/start", label: "Start Here · 2-min guide" },
    ],
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal target only available after mount (avoids SSR mismatch)
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sheet = (
    <div
      className={`mobile-sheet ${open ? "open" : ""}`}
      onClick={() => setOpen(false)}
      aria-hidden={!open}
    >
      <nav onClick={(e) => e.stopPropagation()}>
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

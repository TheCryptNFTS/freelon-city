"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const LINKS = [
  { href: "/civilizations",   label: "City" },
  { href: "/citizens",        label: "Citizens" },
  { href: "/daily",           label: "Signal" },
  { href: "/dashboard",       label: "War Board" },
  { href: "/shop",            label: "Shop" },
  { href: "/earn",            label: "Earn ⬡", gold: true },
  { href: "/carrier",         label: "Carrier", gold: true },
  { href: "/sync",            label: "Sync", gold: true },
  { href: "/leaderboard",     label: "Leaderboard" },
  { href: "/patrons",         label: "Patrons" },
  { href: "/passport",        label: "Passport Preview" },
  { href: "/origin",          label: "Origin" },
  { href: "/lore",            label: "Lore" },
  { href: "/shapes",          label: "Shapes" },
  { href: "/castes",          label: "Castes" },
  { href: "/tribute",         label: "Tribute" },
  { href: "/manifesto",       label: "Manifesto" },
  { href: "/rebuild",         label: "Rebuild" },
  { href: "/lexicon",         label: "Lexicon" },
  { href: "/names",           label: "Names" },
  { href: "/heat",            label: "Heat" },
  { href: "/undervalued",     label: "Undervalued" },
  { href: "/defenders",       label: "Defenders" },
  { href: "/graveyard",       label: "Graveyard" },
  { href: "/pfp",             label: "PFP" },
  { href: "/secrets",         label: "⬡ Secrets", gold: true },
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
        <ul>
          {LINKS.map((l) => (
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

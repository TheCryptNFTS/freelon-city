"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const LINKS = [
  { href: "/origin",        label: "Origin" },
  { href: "/lore",          label: "Lore" },
  { href: "/civilizations", label: "Civilizations" },
  { href: "/dashboard",     label: "Dashboard" },
  { href: "/shapes",        label: "Shapes" },
  { href: "/citizens",      label: "Citizens" },
  { href: "/shop",          label: "Shop" },
  { href: "/earn",          label: "Earn ⬡", gold: true },
  { href: "/leaderboard",   label: "Leaders" },
  { href: "/patrons",       label: "Patrons" },
  { href: "/carrier",       label: "Carrier", gold: true },
  { href: "/sync",          label: "Sync" },
  { href: "/manifesto",     label: "Manifesto" },
  { href: "/tribute",       label: "Tributes" },
  { href: "/pfp",           label: "PFP Studio" },
  { href: "/rebuild",       label: "Rebuild" },
  { href: "/secrets",       label: "⬡ secrets", gold: true },
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
        className="mobile-trigger"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`bar ${open ? "open" : ""}`} />
        <span className={`bar ${open ? "open" : ""}`} />
        <span className={`bar ${open ? "open" : ""}`} />
      </button>
      {/* Portal the sheet to document.body so it escapes the header's
          backdrop-filter containing block. Without this, position: fixed
          gets trapped inside the 72px-tall header. */}
      {mounted && createPortal(sheet, document.body)}
    </>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Route compression 2026-05-25 — mobile nav reduced from 33 links to
// 11. Order: primary CTA first, then CITY / DEEPER / HOLDER /
// ONBOARD. Every removed link still resolves at its direct URL —
// hiding from chrome only, no route deletions. Legal lives in the
// footer; not duplicated here.
const LINKS = [
  { href: "/sync",            label: "⬡ ENTER THE CITY",   gold: true },
  { href: "/archive",         label: "Archive" },
  { href: "/civilizations",   label: "Civilizations" },
  { href: "/combat-archives", label: "Combat Archives" },
  { href: "/shop",            label: "Shop" },
  { href: "/canon",           label: "Canon" },
  { href: "/tribute",         label: "Tribute" },
  { href: "/numbers",         label: "Pulse" },
  { href: "/vault",           label: "⬡ Vault", gold: true },
  { href: "/transmissions",   label: "Transmissions" },
  { href: "/start",           label: "Start Here · 2-min guide" },
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

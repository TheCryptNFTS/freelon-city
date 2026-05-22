"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LINKS: { href: string; label: string; gold?: boolean }[] = [
  { href: "/origin",      label: "Origin" },
  { href: "/lore",        label: "Lore" },
  { href: "/shapes",      label: "Shapes" },
  { href: "/castes",      label: "Castes" },
  { href: "/tribute",     label: "Tribute" },
  { href: "/manifesto",   label: "Manifesto" },
  { href: "/rebuild",     label: "Rebuild" },
  { href: "/lexicon",     label: "Lexicon" },
  { href: "/names",       label: "Names" },
  { href: "/heat",        label: "Heat" },
  { href: "/undervalued", label: "Undervalued" },
  { href: "/defenders",   label: "Defenders" },
  { href: "/graveyard",   label: "Graveyard" },
  { href: "/pfp",         label: "PFP" },
  { href: "/secrets",     label: "⬡ Secrets", gold: true },
];

export function HeaderArchives() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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
    <div className="nav-more" ref={ref}>
      <button
        type="button"
        className="nav-link nav-more-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Archives ▾
      </button>
      {open && (
        <div className="nav-more-menu" role="menu">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={l.gold ? { color: "var(--gold)" } : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

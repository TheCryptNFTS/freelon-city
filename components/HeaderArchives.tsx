"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
            minWidth: 200,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            padding: "8px 0",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 12px 40px -12px rgba(0,0,0,0.6)",
            zIndex: 10000,
          }}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                padding: "10px 18px",
                fontFamily: "var(--mono2)",
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: l.gold ? "var(--gold)" : "var(--ink-2)",
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

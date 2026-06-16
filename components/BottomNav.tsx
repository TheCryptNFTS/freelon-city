"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Mobile bottom tab bar (2026-06-16). Gives the city a native-app spine on phones:
 * a fixed, thumb-reachable bar with the 5 primary destinations, active-state
 * highlighting, safe-area-inset padding for the home indicator. Visible only ≤720px
 * (desktop keeps the header nav); hidden on the full-screen agent workspace via
 * ChromeGate. On-brand: warm-black glass, hexagon/gold glyphs, no emojis. The "Meet"
 * tab (the free hook) carries the gold accent. Pairs with the header hamburger
 * (MobileNav) which still hosts the full grouped menu.
 */

type Tab = { href: string; label: string; icon: React.ReactNode; gold?: boolean; match: (p: string) => boolean };

const S = 22;
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const TABS: Tab[] = [
  {
    href: "/",
    label: "City",
    match: (p) => p === "/",
    icon: (
      <svg width={S} height={S} viewBox="0 0 24 24" aria-hidden {...stroke}>
        <path d="M12 3l7.5 4.3v8.6L12 20.6 4.5 15.9V7.3z" />
        <circle cx="12" cy="11.6" r="2.2" />
      </svg>
    ),
  },
  {
    href: "/live",
    label: "Live",
    match: (p) => p.startsWith("/live"),
    icon: (
      <svg width={S} height={S} viewBox="0 0 24 24" aria-hidden {...stroke}>
        <circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none" />
        <path d="M7.6 7.6a6.2 6.2 0 000 8.8M16.4 7.6a6.2 6.2 0 010 8.8" />
        <path d="M5 5a9.9 9.9 0 000 14M19 5a9.9 9.9 0 010 14" opacity="0.55" />
      </svg>
    ),
  },
  {
    href: "/citizens",
    label: "Citizens",
    match: (p) => p.startsWith("/citizens"),
    icon: (
      <svg width={S} height={S} viewBox="0 0 24 24" aria-hidden {...stroke}>
        <path d="M9 4.6l3.2 1.85v3.7L9 11.9 5.8 10.1V6.45z" />
        <path d="M15.2 12l3.2 1.85v3.7L15.2 19.4 12 17.6v-3.65z" opacity="0.7" />
      </svg>
    ),
  },
  {
    href: "/play",
    label: "Play",
    match: (p) => p.startsWith("/play") || p.startsWith("/crypt"),
    icon: (
      <svg width={S} height={S} viewBox="0 0 24 24" aria-hidden {...stroke}>
        <rect x="4.5" y="5" width="11.5" height="14" rx="2" transform="rotate(-8 10 12)" />
        <rect x="8" y="5" width="11.5" height="14" rx="2" transform="rotate(8 13 12)" />
        <path d="M12.4 10.4l3 1.7-3 1.7z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/demo",
    label: "Meet",
    gold: true,
    match: (p) => p.startsWith("/demo"),
    icon: (
      <svg width={S} height={S} viewBox="0 0 24 24" aria-hidden {...stroke}>
        <path d="M5 6.5h14v8.5H10l-3.5 3v-3H5z" />
        <path d="M9 10.5h6M9 13h3.5" opacity="0.8" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname() || "/";
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            prefetch={false}
            className={`bottom-nav__tab ${active ? "is-active" : ""} ${t.gold ? "is-gold" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav__icon">{t.icon}</span>
            <span className="bottom-nav__label">{t.label}</span>
          </Link>
        );
      })}
      <style>{`
        .bottom-nav {
          display: none;
        }
        @media (max-width: 720px) {
          .bottom-nav {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 90;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 2px;
            padding: 6px 6px calc(6px + env(safe-area-inset-bottom));
            background: color-mix(in srgb, var(--bg, #0b0a09) 86%, transparent);
            -webkit-backdrop-filter: blur(16px) saturate(1.1);
            backdrop-filter: blur(16px) saturate(1.1);
            border-top: 1px solid var(--line, rgba(255,255,255,0.08));
          }
          .bottom-nav__tab {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            min-height: 48px;
            border-radius: 12px;
            text-decoration: none;
            color: var(--ink-dim, rgba(255,255,255,0.5));
            transition: color 140ms ease, background-color 140ms ease;
            -webkit-tap-highlight-color: transparent;
          }
          .bottom-nav__tab:active { background: rgba(255,255,255,0.05); }
          .bottom-nav__icon { display: grid; place-items: center; height: 22px; }
          .bottom-nav__label {
            font-family: var(--mono2, monospace);
            font-size: 9.5px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            line-height: 1;
          }
          .bottom-nav__tab.is-active { color: var(--ink, #fff); }
          .bottom-nav__tab.is-gold { color: color-mix(in srgb, var(--gold, #e7c074) 78%, var(--ink-dim)); }
          .bottom-nav__tab.is-active.is-gold,
          .bottom-nav__tab.is-gold.is-active { color: var(--gold, #e7c074); }
          .bottom-nav__tab.is-active::before {
            content: "";
            position: absolute;
            top: 3px;
            left: 50%;
            transform: translateX(-50%);
            width: 16px;
            height: 2px;
            border-radius: 2px;
            background: currentColor;
          }
        }
      `}</style>
    </nav>
  );
}

export default BottomNav;

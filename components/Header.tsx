import Link from "next/link";
import Image from "next/image";
import { MobileNav } from "@/components/MobileNav";
import { WalletConnect } from "@/components/WalletConnect";
import { HeaderHexPill } from "@/components/HeaderHexPill";
import { HeaderHolderLinks } from "@/components/HeaderHolderLinks";
import { OPENSEA_BASE } from "@/lib/constants";

/**
 * Site header. Primary nav is the launcher spine — the three co-equal
 * product doors (Enter Mars / Play TCG / AI Citizens) + Own — followed by
 * holder tools, the hex pill, and the wallet. Everything else is demoted to
 * the fat Footer. All chrome is class-based — local styles live in the
 * <style> block at the bottom of this file, which itself reads from
 * Phase 1 tokens.
 */
export function Header() {
  return (
    <header className="site-header">
      <div className="bar">
        <Link href="/" className="brand">
          <Image src="/logo.png" alt="" width={36} height={36} priority className="brand-logo" />
          {/* 2026-06-30 cold-visitor fix: the wordmark used to read "404 ·
              FREELON CITY" as one string, so a first-time visitor's eye caught
              "404" first and read the whole site as a broken/not-found page. The
              #404HEXNOTFOUND motif STAYS — but as a small gold badge BEFORE the
              brand, so "FREELON CITY" is the primary readable mark and 404 reads
              as intentional identity, not an error. Link text resolves to
              "404 FREELON CITY" for screen readers, preserving the lore. */}
          <span className="brand-mark">
            <span className="brand-badge">404</span>
            <span className="brand-text">FREELON CITY</span>
          </span>
        </Link>

        <nav className="desktop-nav">
          {/* 2026-06-29 LAUNCHER NAV (founder: full premium product rebuild —
              "only the three product actions should fight for top-level
              attention"). Top nav is now the three co-equal product doors +
              Own; every secondary route (lore / civilizations / archive /
              collections / help / status) is demoted to the fat Footer, which
              is the desktop "menu". prefetch={false} keeps first-load bandwidth
              on the page being viewed, not the nav targets. */}
          <Link href="/mars-command" prefetch={false} className="nav-link nav-start">Enter Mars</Link>
          <Link href="/crypt-tcg" prefetch={false} className="nav-link">Play TCG</Link>
          <Link href="/demo" prefetch={false} className="nav-link">AI Citizens</Link>
          <a href={OPENSEA_BASE} target="_blank" rel="noreferrer" className="nav-link">Own ↗</a>
          {/* Returning-holder tools — only render once a holding wallet is
              connected, so the newcomer front door stays condensed. */}
          <HeaderHolderLinks />
          <HeaderHexPill />
          <span className="wallet-slot"><WalletConnect /></span>
        </nav>

        {/* 2026-06-11 Discord (Damien, 3rd report): below 980px the entire
            desktop-nav — incl. the only CONNECT control — is hidden, so a
            newcomer in a wallet browser sees just a logo + MENU and hunts for a
            "profile / login" that isn't there. A persistent SIGN IN pill → /sync
            (the wallet + X hub). Mobile-only; desktop keeps the WalletConnect
            pill. Lucifer's own in-thread call ("maybe an x button"). */}
        <Link href="/sync" prefetch={false} className="mobile-signin">Sign in</Link>
        <MobileNav />
      </div>

      <style>{`
        .site-header {
          border-bottom: 1px solid var(--line);
          background: rgba(11,11,13,0.82);
          backdrop-filter: blur(16px) saturate(120%);
          -webkit-backdrop-filter: blur(16px) saturate(120%);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .site-header .bar {
          display: flex; align-items: center; justify-content: space-between;
          height: 72px;
          max-width: var(--maxw);
          margin: 0 auto;
          padding: 0 var(--pad);
        }
        .brand { display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .brand-logo { display: block; }
        .brand-mark { display: inline-flex; align-items: center; gap: 8px; }
        /* "404" reduced to a small gold badge so the brand resolves as
           FREELON CITY first (cold-visitor de-confusion); 404 lore preserved. */
        .brand-badge {
          font-family: var(--mono2);
          font-size: 9px;
          line-height: 1;
          letter-spacing: 0.14em;
          color: var(--gold);
          border: 1px solid color-mix(in srgb, var(--gold) 38%, transparent);
          background: color-mix(in srgb, var(--gold) 8%, transparent);
          border-radius: 4px;
          padding: 3px 5px;
          flex-shrink: 0;
        }
        .brand-text {
          font-family: var(--mono2);
          font-size: 12px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink);
          white-space: nowrap;
        }
        .desktop-nav { display: flex; gap: 14px; align-items: center; }
        .nav-link {
          font-family: var(--mono2);
          font-size: var(--t-mono-sm);
          letter-spacing: var(--tr-pill);
          text-transform: uppercase;
          color: var(--ink-2);
          transition: color .2s ease;
        }
        .nav-link:hover { color: var(--gold-bright); }
        .nav-start { color: var(--gold); font-weight: 600; }
        .nav-start:hover { color: var(--gold-bright); }
        .nav-sync {
          text-transform: uppercase; letter-spacing: var(--tr-pill);
          /* WCAG 2.5.5 tap target: bump primary CTA from .btn-sm's 40px
             default to 44px so iPad-landscape touch users (above the 980px
             mobile-nav cutoff) hit it reliably. Scoped here, not on global
             .btn-sm. 2026-05-27 a11y debug. */
          min-height: 44px;
          display: inline-flex; align-items: center;
        }
        .nav-earn-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: var(--r-pill);
          border: 1px solid var(--gold);
          background: var(--tint-gold);
          color: var(--gold);
          font-family: var(--mono2);
          font-size: var(--t-mono-xs);
          letter-spacing: var(--tr-pill);
          text-transform: uppercase;
          font-weight: 600;
          transition: background 120ms ease, transform 120ms ease;
          text-decoration: none;
        }
        .nav-earn-pill:hover {
          background: var(--tint-gold-2);
          transform: translateY(-1px);
        }
        /* Mobile sign-in pill (2026-06-11): the visible "login/profile" door
           a newcomer expects. Gold-ghost (matches the unified secondary).
           Hidden on desktop (the WalletConnect pill covers it there). */
        .mobile-signin {
          display: none;
          font-family: var(--mono2); font-size: 11px; letter-spacing: var(--tr-pill);
          text-transform: uppercase; text-decoration: none; white-space: nowrap;
          padding: 9px 16px; min-height: 40px; border-radius: 999px;
          align-items: center; flex-shrink: 0;
          border: 1px solid color-mix(in srgb, var(--gold) 45%, transparent);
          background: color-mix(in srgb, var(--gold) 8%, transparent);
          color: var(--gold);
          margin-left: auto; margin-right: 8px;
          transition: background .15s ease, border-color .15s ease;
        }
        .mobile-signin:active { background: color-mix(in srgb, var(--gold) 16%, transparent); }
        @media (max-width: 980px) { .desktop-nav { display: none !important; } .mobile-signin { display: inline-flex; } }
        /* 2026-06-30 mobile journey QA: at ≤400px the wordmark (flex-shrink:0)
           squeezed the SIGN IN pill until its text wrapped to two lines. Tighten
           the wordmark + pill so the header holds one clean row. */
        @media (max-width: 400px) {
          .brand-text { letter-spacing: 0.12em; }
          .brand-mark { gap: 6px; }
          .mobile-signin { padding: 8px 12px; margin-right: 6px; }
        }
        @media (min-width: 981px) { .mobile-trigger, .mobile-sheet { display: none !important; } }
        .nav-more-trigger {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          font: inherit;
          color: var(--ink-2);
          text-transform: uppercase;
          letter-spacing: var(--tr-pill);
          font-size: var(--t-mono-sm);
          font-family: var(--mono2);
          /* Explicit 44px hit area centered around the small text; bar is
             align-items:center so this doesn't shift the visual baseline.
             2026-05-27 a11y debug. */
          min-height: 44px;
          display: inline-flex; align-items: center;
        }
      `}</style>
    </header>
  );
}

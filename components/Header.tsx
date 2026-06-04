import Link from "next/link";
import Image from "next/image";
import { MobileNav } from "@/components/MobileNav";
import { WalletConnect } from "@/components/WalletConnect";
import { HeaderHexPill } from "@/components/HeaderHexPill";
import { HeaderArchives } from "@/components/HeaderArchives";

/**
 * Site header. Primary nav trimmed to 4 items (Start / Citizens / The
 * Numbers / Shop) + Archives dropdown + EARN HEX + Sync + hex pill +
 * wallet. All chrome is class-based — local styles live in the
 * <style> block at the bottom of this file, which itself reads from
 * Phase 1 tokens.
 */
export function Header() {
  return (
    <header className="site-header">
      <div className="bar">
        <Link href="/" className="brand">
          <Image src="/logo.png" alt="FREELON CITY" width={36} height={36} priority className="brand-logo" />
          <span className="brand-text">404 · FREELON CITY</span>
        </Link>

        <nav className="desktop-nav">
          {/* 2026-06-04 AGENTS-FIRST nav (founder: "agents are the main thing").
              The top bar is now just the product + the free hook + one Explore
              menu: FREELONS → Earn HEX → Explore ▾. Start / Play / Dashboard
              moved INTO Explore ▾ (they're not the front door). FREELONS (the
              trainable agents) is the gold pillar. Primary action: Own a Freelon. */}
          <Link href="/citizens" className="nav-link nav-start">FREELONS</Link>
          <Link href="/earn" className="nav-link">Earn HEX</Link>
          <HeaderArchives />
          <a href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer" className="btn btn-primary btn-sm nav-sync">Own a Freelon</a>
          <HeaderHexPill />
          <span className="wallet-slot"><WalletConnect /></span>
        </nav>

        <MobileNav />
      </div>

      <style>{`
        .site-header {
          border-bottom: 1px solid var(--line);
          background: rgba(10,12,18,0.85);
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
        .brand { display: inline-flex; align-items: center; gap: 12px; }
        .brand-logo { display: block; }
        .brand-text {
          font-family: var(--mono2);
          font-size: 12px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .desktop-nav { display: flex; gap: 18px; align-items: center; }
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
        @media (max-width: 980px) { .desktop-nav { display: none !important; } }
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

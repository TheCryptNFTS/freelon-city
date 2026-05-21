import Link from "next/link";
import Image from "next/image";
import { MobileNav } from "@/components/MobileNav";
import { WalletConnect } from "@/components/WalletConnect";
import { HeaderHexPill } from "@/components/HeaderHexPill";

export function Header() {
  return (
    <header className="border-b" style={{ borderColor: "var(--line)", background: "rgba(10,12,18,0.85)", backdropFilter: "blur(16px) saturate(120%)", WebkitBackdropFilter: "blur(16px) saturate(120%)", position: "sticky", top: 0, zIndex: 100 }}>
      <div className="bar">
        <Link href="/" className="brand" style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <Image src="/logo.png" alt="FREELON CITY" width={36} height={36} priority style={{ display: "block" }} />
          <span style={{ fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--ink)" }}>404 · FREELON CITY</span>
        </Link>
        <nav className="desktop-nav" style={{ display: "flex", gap: 22, alignItems: "center" }}>
          <Link href="/citizens" className="nav-link">Citizens</Link>
          <Link href="/civilizations" className="nav-link">Civilizations</Link>
          <Link href="/daily" className="nav-link">Daily</Link>
          <Link href="/leaderboard" className="nav-link">Leaders</Link>
          <Link href="/shop" className="nav-link">Shop</Link>
          <Link href="/earn" className="nav-link" style={{ color: "var(--gold)" }}>Earn ⬡</Link>
          <Link href="/carrier" className="nav-link" style={{ color: "var(--gold)" }}>Carrier</Link>
          <div className="nav-more">
            <button type="button" className="nav-link nav-more-trigger" aria-haspopup="true">Explore ▾</button>
            <div className="nav-more-menu">
              <Link href="/origin">Origin</Link>
              <Link href="/lore">Lore</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/shapes">Shapes</Link>
              <Link href="/castes">Castes</Link>
              <Link href="/tribute">Tributes</Link>
              <Link href="/patrons">Patrons</Link>
              <Link href="/manifesto">Manifesto</Link>
              <Link href="/rebuild">Rebuild</Link>
              <Link href="/lexicon">Lexicon</Link>
              <Link href="/pfp">PFP Studio</Link>
              <Link href="/secrets" style={{ color: "var(--gold)" }}>⬡ Secrets</Link>
            </div>
          </div>
          <HeaderHexPill />
          <span className="wallet-slot"><WalletConnect /></span>
        </nav>
        <MobileNav />
      </div>
      <style>{`
        header .bar { display: flex; align-items: center; justify-content: space-between; height: 72px; max-width: var(--maxw); margin: 0 auto; padding: 0 var(--pad); }
        .nav-link { font-family: var(--mono2); font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-2); transition: color .2s ease; }
        .nav-link:hover { color: var(--gold-bright); }
        @media (max-width: 980px) { .desktop-nav { display: none !important; } }
        @media (min-width: 981px) { .mobile-trigger, .mobile-sheet { display: none !important; } }
        .nav-more { position: relative; }
        .nav-more-trigger { background: transparent; border: none; cursor: pointer; padding: 0; font: inherit; color: var(--ink-2); text-transform: uppercase; letter-spacing: 0.22em; font-size: 11px; font-family: var(--mono2); }
        .nav-more-menu {
          position: absolute; top: calc(100% + 14px); right: 0;
          min-width: 200px;
          background: var(--surface);
          border: 1px solid var(--line);
          padding: 8px 0;
          display: none;
          flex-direction: column;
          box-shadow: 0 12px 40px -12px rgba(0,0,0,0.6);
          z-index: 200;
        }
        .nav-more:hover .nav-more-menu,
        .nav-more:focus-within .nav-more-menu { display: flex; }
        .nav-more-menu a {
          padding: 10px 18px;
          font-family: var(--mono2);
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink-2);
          text-decoration: none;
        }
        .nav-more-menu a:hover { color: var(--gold-bright); background: rgba(200,170,100,0.06); }
      `}</style>
    </header>
  );
}

import Link from "next/link";
import Image from "next/image";
import { MobileNav } from "@/components/MobileNav";
import { WalletConnect } from "@/components/WalletConnect";

export function Header() {
  return (
    <header className="border-b" style={{ borderColor: "var(--line)", background: "rgba(10,12,18,0.85)", backdropFilter: "blur(16px) saturate(120%)", WebkitBackdropFilter: "blur(16px) saturate(120%)", position: "sticky", top: 0, zIndex: 100 }}>
      <div className="bar">
        <Link href="/" className="brand" style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <Image src="/logo.png" alt="FREELON CITY" width={36} height={36} priority style={{ display: "block" }} />
          <span style={{ fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--ink)" }}>404 · FREELON CITY</span>
        </Link>
        <nav className="desktop-nav" style={{ display: "flex", gap: 26 }}>
          <Link href="/origin" className="nav-link">Origin</Link>
          <Link href="/lore" className="nav-link">Lore</Link>
          <Link href="/civilizations" className="nav-link">Civilizations</Link>
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
          <Link href="/shapes" className="nav-link">Shapes</Link>
          <Link href="/citizens" className="nav-link">Citizens</Link>
          <Link href="/shop" className="nav-link">Shop</Link>
          <Link href="/carrier" className="nav-link" style={{ color: "var(--gold)" }}>Carrier</Link>
          <Link href="/secrets" className="nav-link" style={{ color: "var(--gold)", fontSize: 9, letterSpacing: "0.28em", opacity: 0.7 }}>⬡</Link>
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
      `}</style>
    </header>
  );
}

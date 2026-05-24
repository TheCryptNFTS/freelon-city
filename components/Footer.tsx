import Link from "next/link";
import { CONTRACT, IMAGE_CID, METADATA_CID, OPENSEA_BASE, ETHERSCAN_BASE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-white/5 mt-32">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-12 text-sm">
        <div>
          <div className="text-[var(--color-gold)] text-lg font-light tracking-widest">404 — FREELON CITY</div>
          <div className="text-[var(--color-ink-dim)] mt-2 leading-relaxed">
            4040 citizens of a Martian civilization built around the missing hex.
            ON MARS. WE HEAR. WE SYNC. WE ARE.
          </div>
        </div>
        <div>
          <div className="text-[var(--color-ink)] text-xs uppercase tracking-widest mb-3">Navigate</div>
          <ul className="space-y-1 text-[var(--color-ink-dim)]">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/origin">Origin</Link></li>
            <li><Link href="/civilizations">Civilizations</Link></li>
            <li><Link href="/shapes">Shapes</Link></li>
            <li><Link href="/castes">Castes</Link></li>
            <li><Link href="/citizens">Citizens</Link></li>
            <li><Link href="/names">Name Hall of Fame</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[var(--color-ink)] text-xs uppercase tracking-widest mb-3">On-chain</div>
          <ul className="space-y-1 text-[var(--color-ink-dim)] terminal text-xs">
            <li><a href={OPENSEA_BASE} target="_blank" rel="noreferrer">opensea ↗</a></li>
            <li><a href={ETHERSCAN_BASE} target="_blank" rel="noreferrer">etherscan ↗</a></li>
            <li>contract · {CONTRACT.slice(0, 6)}…{CONTRACT.slice(-4)}</li>
            <li>image CID · {IMAGE_CID.slice(0, 6)}…{IMAGE_CID.slice(-4)}</li>
            <li>meta CID · {METADATA_CID.slice(0, 6)}…{METADATA_CID.slice(-4)}</li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 pb-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--color-ink-dim)] terminal border-t border-white/5 pt-6">
        <Link href="/start" style={{ color: "var(--color-gold)", fontWeight: 600 }}>Start Here</Link>
        <Link href="/numbers">Numbers</Link>
        <Link href="/architect">Architect</Link>
        <Link href="/roadmap">Roadmap</Link>
        <Link href="/press">Press</Link>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/honorary-notice">Honorary Notice</Link>
        <Link href="/legal/dmca">DMCA + Contact</Link>
        <Link href="/lexicon">Lexicon</Link>
        <span style={{ marginLeft: "auto" }}>Cycle 0404 · Sealed on Ethereum mainnet</span>
      </div>
    </footer>
  );
}

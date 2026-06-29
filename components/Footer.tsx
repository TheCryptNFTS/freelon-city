import Link from "next/link";
import { OPENSEA_BASE, ETHERSCAN_BASE } from "@/lib/constants";

/**
 * Footer directory — rebuilt 6 cols → 4 (2026-06-29 site-design rebuild).
 * The "fat footer" had grown to ~30 routes across six columns and read as a
 * sitemap dump. It's now four focused groups matching the product hierarchy and
 * the mobile menu: Play / City / Own / Support. Demoted (not deleted) routes —
 * /earn, /shop, /canon, /transmissions, /press, /developers, the per-game
 * /play/* pages — still live at their own URLs and remain reachable from /play
 * and their feature surfaces; they just no longer clutter the front door.
 */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__cols">
        <div className="site-footer__col">
          <h2 className="site-footer__heading">Play</h2>
          <ul>
            <li><Link href="/mars-command">Enter Mars</Link></li>
            <li><Link href="/crypt-tcg">Crypt TCG</Link></li>
            <li><Link href="/demo">Meet a Citizen</Link></li>
            <li><Link href="/play">All Games</Link></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">City</h2>
          <ul>
            <li><Link href="/citizens">The 4,040</Link></li>
            <li><Link href="/collections">The Six Collections</Link></li>
            <li><Link href="/civilizations">Ten Civilizations</Link></li>
            <li><Link href="/archive">The Archive</Link></li>
            <li><Link href="/report">The Signal Report</Link></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">Own</h2>
          <ul>
            <li><a href={OPENSEA_BASE} target="_blank" rel="noreferrer">Own a FREELON ↗</a></li>
            <li><Link href="/my-citizens">My Citizens</Link></li>
            <li><Link href="/dashboard">Dashboard</Link></li>
            <li><Link href="/sync">Connect wallet + X</Link></li>
            <li><a href={ETHERSCAN_BASE} target="_blank" rel="noreferrer">Contract ↗</a></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">Support</h2>
          <ul>
            <li><Link href="/help">Help · Start here</Link></li>
            <li><Link href="/legal/terms">Terms</Link></li>
            <li><Link href="/legal/privacy">Privacy</Link></li>
            <li><Link href="/legal">All policies</Link></li>
            <li><a href="https://discord.gg/xcK3E8nCB8" target="_blank" rel="noreferrer">Discord ↗</a></li>
            <li><a href="https://x.com/4040hex" target="_blank" rel="noreferrer">X ↗</a></li>
          </ul>
        </div>
      </div>

      <div className="site-footer__seal">
        Cycle 0404 · Sealed on Ethereum mainnet
      </div>

      <style>{`
        .site-footer {
          border-top: 1px solid var(--line);
          margin-top: var(--s-9);
          padding: var(--s-7) var(--pad) var(--s-5);
          max-width: var(--maxw);
          margin-left: auto;
          margin-right: auto;
        }
        .site-footer__cols {
          display: grid;
          /* Flow the 6 directory columns by width — 6 across on desktop down to
             2-3 on tablet, then 1 on phones (the 720px rule below). */
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--s-6) var(--s-5);
        }
        .site-footer__col ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .site-footer__heading {
          /* 2026-05-26: was <div>, now <h2> for landmark/a11y. Reset
             browser h2 defaults so the visual stays identical. */
          margin: 0 0 14px;
          font-family: var(--mono2);
          font-size: var(--t-mono-xs);
          font-weight: 400;
          letter-spacing: var(--tr-mono);
          text-transform: uppercase;
          color: var(--ink-dim);
          line-height: 1;
        }
        .site-footer__col a {
          font-family: var(--mono2);
          font-size: var(--t-mono-sm);
          letter-spacing: var(--tr-loose);
          color: var(--ink-2);
          text-decoration: none;
          transition: color 140ms ease;
        }
        .site-footer__col a:hover { color: var(--gold); }
        .site-footer__seal {
          margin-top: var(--s-6);
          padding-top: var(--s-4);
          border-top: 1px dashed var(--line);
          font-family: var(--mono2);
          font-size: var(--t-mono-xs);
          letter-spacing: var(--tr-mono);
          text-transform: uppercase;
          color: var(--ink-dim);
          text-align: center;
        }
        @media (max-width: 720px) {
          .site-footer__cols {
            grid-template-columns: 1fr;
            gap: var(--s-5);
          }
        }
      `}</style>
      {/* 2026-06-11 cheap-fix #8 — the sign-off band: pages end with the
          city's signature instead of stopping mid-air. */}
      <div className="footer-signoff">
        <span className="footer-signoff__mark">⬡ FREELON <span>CITY</span></span>
        <span className="footer-signoff__line">A living AI civilization · founded on-chain 2023</span>
      </div>
    </footer>
  );
}

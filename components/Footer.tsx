import Link from "next/link";
import { METADATA_CID, OPENSEA_BASE, ETHERSCAN_BASE } from "@/lib/constants";

/**
 * Footer directory (2026-06-14). The top nav is deliberately condensed to the
 * spine, which left ~30 real pages reachable only by typing the URL — holders
 * were guessing /shop, /earn, etc. to find them (Billy, Discord). This brings
 * back a grouped "fat footer" so every public page is one click away WITHOUT
 * bloating the primary nav. Dynamic pages (/citizens/[id], /agent/[id], …),
 * /admin, and the hidden /the-fifth-bracket (renders a 404) are intentionally
 * omitted; deep legal sub-pages live under their own features.
 */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__cols">
        <div className="site-footer__col">
          <h2 className="site-footer__heading">The City</h2>
          <ul>
            <li><Link href="/citizens">The 4,040 FREELONS</Link></li>
            <li><Link href="/collections">The Six Collections</Link></li>
            <li><Link href="/civilizations">Ten Civilizations</Link></li>
            <li><Link href="/dashboard">Dashboard</Link></li>
            <li><Link href="/my-citizens">My Citizens</Link></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">Play</h2>
          <ul>
            <li><Link href="/play">All Games</Link></li>
            <li><Link href="/crypt-tcg">Crypt TCG</Link></li>
            <li><Link href="/play/hex-match">Hex Match</Link></li>
            <li><Link href="/play/restore">Restore the Signal</Link></li>
            <li><Link href="/play/guard">Guard the Pot</Link></li>
            <li><Link href="/play/reckoning">The Reckoning</Link></li>
            <li><Link href="/play/sweep">Sweep Run</Link></li>
            <li><Link href="/play/cipher">The Cipher</Link></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">Start here</h2>
          <ul>
            <li><Link href="/start">New here? Start</Link></li>
            <li><Link href="/demo">Meet a Citizen</Link></li>
            <li><Link href="/sync">Connect wallet + X</Link></li>
            <li><Link href="/earn">Earn HEX</Link></li>
            <li><Link href="/shop">Shop</Link></li>
            <li><Link href="/help">Help</Link></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">Signal &amp; lore</h2>
          <ul>
            <li><Link href="/report">The Signal Report</Link></li>
            <li><Link href="/canon">Canon</Link></li>
            <li><Link href="/archive">The Archive</Link></li>
            <li><Link href="/transmissions">Transmissions</Link></li>
            <li><Link href="/carrier-of-the-week">Carrier of the Week</Link></li>
            <li><Link href="/press">Press</Link></li>
            <li><Link href="/developers">Developers</Link></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">On-chain</h2>
          <ul>
            <li>
              <a href={ETHERSCAN_BASE} target="_blank" rel="noreferrer">
                Contract ↗
              </a>
            </li>
            <li>
              <a href={`https://ipfs.io/ipfs/${METADATA_CID}`} target="_blank" rel="noreferrer">
                IPFS ↗
              </a>
            </li>
            <li>
              <a href={OPENSEA_BASE} target="_blank" rel="noreferrer">
                OpenSea ↗
              </a>
            </li>
            <li>
              <a href="https://x.com/4040hex" target="_blank" rel="noreferrer">
                X ↗
              </a>
            </li>
            <li>
              <a href="https://discord.gg/xcK3E8nCB8" target="_blank" rel="noreferrer">
                Discord ↗
              </a>
            </li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">Legal</h2>
          <ul>
            <li><Link href="/legal/terms">Terms</Link></li>
            <li><Link href="/legal/privacy">Privacy</Link></li>
            <li><Link href="/legal/honorary-notice">Honorary Notice</Link></li>
            <li><Link href="/legal/dmca">DMCA</Link></li>
            <li><Link href="/legal">All policies</Link></li>
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

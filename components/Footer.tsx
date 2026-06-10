import Link from "next/link";
import { METADATA_CID, OPENSEA_BASE, ETHERSCAN_BASE } from "@/lib/constants";

/**
 * Route compression 2026-05-25 — footer simplified from 3-column,
 * 22-link sprawl to 3 minimal columns: ON-CHAIN proof / canonical
 * NAVIGATE / LEGAL. The branding paragraph, the on-chain CID echo
 * row, and the dense link-cloud at the bottom are all gone.
 *
 * Dropped links (still reachable by direct URL — chrome cleanup
 * only, no route deletions):
 *   /vault, /origin, /shapes, /castes, /citizens, /names,
 *   /numbers (moved to More dropdown), /architect, /roadmap,
 *   /press, /lexicon, brand paragraph, image/meta CID rows.
 */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__cols">
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
          {/* 2026-06-08 radical condense — footer Navigate trimmed to the spine.
              Archive / Civilizations / Play / Canon / Shop / Developers dropped
              from chrome (pages still live by URL). Crypt TCG kept, flagged soon. */}
          <h2 className="site-footer__heading">Navigate</h2>
          <ul>
            <li><Link href="/citizens">FREELONS</Link></li>
            <li><Link href="/report">The Signal Report</Link></li>
            <li><Link href="/demo">Meet a Citizen</Link></li>
            <li><Link href="/collections">Collections</Link></li>
            <li><Link href="/start">Start</Link></li>
            <li><Link href="/crypt-tcg">Crypt TCG · play</Link></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">Legal</h2>
          <ul>
            <li><Link href="/legal/terms">Terms</Link></li>
            <li><Link href="/legal/privacy">Privacy</Link></li>
            <li><Link href="/legal/honorary-notice">Honorary Notice</Link></li>
            <li><Link href="/legal/dmca">DMCA</Link></li>
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
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--s-6);
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
    </footer>
  );
}

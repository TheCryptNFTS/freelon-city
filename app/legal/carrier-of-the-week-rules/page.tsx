import type { Metadata } from "next";
import { LegalShell } from "../LegalShell";

export const metadata: Metadata = {
  title: "Carrier of the Week — Official Rules",
  robots: { index: false },
};

/**
 * Official Rules for the "Carrier of the Week" recognition program.
 *
 * This is NOT a sweepstakes. There is no purchase, no paid entry, no AMOE, and
 * NO element of chance — the winner is selected on objective, publicly recorded
 * MERIT (server-side progression records — NOT on-chain; never claim on-chain).
 * The only reward is recognition (a featured slot + a non-transferable laurel on
 * the token). It has no cash value and is not transferable, mirroring the
 * Terms §6 "no resale value, not transferable" precedent. noindex.
 *
 * ⚠ Counsel should confirm the merit-contest framing and finalize the sponsor entity
 * + governing-law specifics. 2026-06-21: raw [BRACKETED] placeholders were showing on
 * this LIVE (footer-linked) page, so they were generalized to truthful neutral wording
 * ("the operator of FREELON CITY" / "applicable law") until counsel fills the specifics.
 */
export default function CarrierOfTheWeekRules() {
  return (
    <LegalShell title="Carrier of the Week — Official Rules" updated="2026-06-08">
      <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--gold)" }}>
        FREE TO PARTICIPATE. NO PURCHASE OR PAYMENT OF ANY KIND IS REQUIRED. THE WINNER IS
        SELECTED ON MERIT, NOT BY CHANCE. VOID WHERE PROHIBITED.
      </p>

      <h2>1. Sponsor.</h2>
      <p>
        This recognition program (&ldquo;Carrier of the Week&rdquo;) is operated by
        the operator of FREELON CITY (the &ldquo;Sponsor&rdquo;). It is in no way sponsored,
        endorsed, administered by, or associated with any wallet, marketplace, or platform provider.
      </p>

      <h2>2. Eligibility.</h2>
      <p>
        Open only to FREELON CITY citizen tokens. The participating individual must be at least 18
        years old (19 where required). Void where prohibited or restricted by law. Employees of the
        Sponsor and their immediate families are not eligible.
      </p>

      <h2>3. No entry, no purchase, no payment.</h2>
      <p>
        There is nothing to enter, buy, or pay. Every eligible citizen token is automatically
        considered each ISO week based solely on its publicly recorded progression. No
        in-app credit (&ldquo;⬡&rdquo;) is required, spent, or awarded, and no payment increases or
        affects standing in any way.
      </p>

      <h2>4. How the winner is selected (skill / merit).</h2>
      <p>
        Each ISO week the Sponsor selects one (1) citizen token that ranks highest on the city&rsquo;s
        objective merit leaderboard — measured by level, specialized skill, and recorded
        training history. Selection is determined by these objective criteria, not by chance, lottery,
        or random draw. The Sponsor&rsquo;s server records of progression are final and binding on all
        questions of selection. One citizen is recognized per ISO week.
      </p>

      <h2>5. Recognition (the only reward).</h2>
      <p>
        The selected citizen receives recognition only: a featured slot on the Carrier of the Week
        page and a permanent laurel notation on the token&rsquo;s public memory log. This recognition
        has no cash value, is not redeemable for ⬡, ETH, fiat, or any currency, is not a prize or
        payout, is not transferable, and is not a financial product or benefit of any kind. Nothing
        here is an investment, and no return, appreciation, or financial benefit is offered or implied.
      </p>

      <h2>6. Conditions.</h2>
      <ul>
        <li>Attempts to manipulate, falsify, or game the progression record may result in disqualification.</li>
        <li>The Sponsor may modify, suspend, or cancel the program for any reason, including technical failure or suspected fraud.</li>
        <li>No purchase of any FREELON NFT or other asset is required to be recognized.</li>
        <li>The Sponsor&rsquo;s decision is final in all matters relating to selection.</li>
      </ul>

      <h2>7. Disputes.</h2>
      <p>
        These Official Rules are governed by applicable law. By participating, you agree
        these Rules and the Sponsor&rsquo;s decisions are final.
      </p>

      <h2>8. Privacy.</h2>
      <p>
        Information is handled per our <a href="/legal/privacy">Privacy Policy</a>. See also our{" "}
        <a href="/legal/terms">Terms</a>.
      </p>
    </LegalShell>
  );
}

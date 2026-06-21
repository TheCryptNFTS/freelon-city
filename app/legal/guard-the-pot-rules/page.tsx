import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalShell } from "../LegalShell";

export const metadata: Metadata = { title: "Guard the Pot — Official Rules", robots: { index: false } };

/**
 * DRAFT Official Rules for the "Guard the Pot" promotion.
 *
 * ⚠ ATTORNEY REVIEW REQUIRED BEFORE LAUNCH. This is a sweepstakes-shaped template
 * assembled from the legal-compliance review (no-purchase-necessary free entry,
 * sponsor identity, eligibility/geo gating, non-cashable ⬡ disclosure, final/
 * non-refundable, fixed non-money/external prize). A pay-to-enter, pot-grows-from-
 * fees, winner-takes-pot construct is lottery-shaped and must NOT ship without a
 * licensed promotions/gaming attorney signing off on this structure and filling
 * the [BRACKETED] blanks. The page is noindex and only linked when GUARD_POT_LIVE.
 */
export default function GuardThePotRules() {
  // DRAFT rules with [BRACKETED] blanks pending counsel — never serve them publicly
  // until the promotion is actually live (matches the /play/guard + /play card gates). 2026-06-21.
  if (process.env.GUARD_POT_LIVE !== "true") notFound();

  return (
    <LegalShell title="Guard the Pot — Official Rules" updated="2026-06-08 (DRAFT)">
      <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--gold)" }}>
        NO PURCHASE NECESSARY. A PURCHASE OR PAYMENT OF ANY KIND WILL NOT INCREASE YOUR
        CHANCES OF WINNING. VOID WHERE PROHIBITED.
      </p>

      <h2>1. Sponsor.</h2>
      <p>
        This promotion (&ldquo;Guard the Pot&rdquo;) is sponsored by [SPONSOR LEGAL ENTITY],
        [ADDRESS] (the &ldquo;Sponsor&rdquo;). The promotion is in no way sponsored, endorsed,
        or administered by, or associated with, any wallet, marketplace, or platform provider.
      </p>

      <h2>2. Eligibility.</h2>
      <p>
        Open only to individuals who are at least 18 years old (19 where required) at the time of
        entry. Void in [EXCLUDED JURISDICTIONS] and wherever prohibited or restricted by law.
        Employees of the Sponsor and their immediate families are not eligible. By entering you
        confirm you meet these requirements.
      </p>

      <h2>3. Promotion period.</h2>
      <p>
        A round begins when opened by the Sponsor and ends when the prize is awarded or the round
        is closed, whichever is first ([START]–[END], or until won). The Sponsor&rsquo;s clock is
        the official timekeeper.
      </p>

      <h2>4. How to enter.</h2>
      <p>There are two methods of entry, and both have an equal chance of winning:</p>
      <ol>
        <li>
          <strong>Paid attempt.</strong> Send a message to the in-game guard agent by spending the
          displayed amount of HEX (&ldquo;⬡&rdquo;), the site&rsquo;s in-app credit. The ⬡ amount
          escalates with each attempt and is fully consumed (&ldquo;burned&rdquo;) on use.
        </li>
        <li>
          <strong>Free alternate method of entry (AMOE).</strong> To enter without spending ⬡,
          submit one message of equal length and form, with equal standing and equal chance of
          winning, via [FREE ENTRY URL / MAILING ADDRESS] during the promotion period. [LIMIT: one
          free entry per person per [PERIOD]]. Free entries are judged on the same basis as paid
          attempts.
        </li>
      </ol>
      <p>
        ⬡ is an in-app credit only. It has no cash value, is not redeemable for ETH, fiat, or any
        currency, and is not withdrawable. Spending ⬡ on a paid attempt is final and
        non-refundable except where the attempt fails to be processed.
      </p>

      <h2>5. How a winner is determined.</h2>
      <p>
        Each entry is one message to the guard agent. An entry &ldquo;wins&rdquo; if the guard agent
        releases the vault in response to that message under the Sponsor&rsquo;s server-side rules.
        Outcomes depend in material part on factors outside any entrant&rsquo;s control. The
        Sponsor&rsquo;s server records are final and binding on all questions of entry, timing, and
        winner determination. Only one (1) winner is awarded per round; the first qualifying entry
        recorded by the Sponsor wins.
      </p>

      <h2>6. Prize.</h2>
      <p>
        One (1) prize per round: [PRIZE DESCRIPTION] with an approximate retail value of [ARV]. The
        prize is provided from outside the in-app ⬡ economy and is not paid in ⬡. No transfer or
        substitution except by the Sponsor, who may substitute a prize of equal or greater value.
        The winner is solely responsible for all applicable taxes.
      </p>

      <h2>7. Odds.</h2>
      <p>
        Odds of winning depend on the number and quality of entries and on the guard agent&rsquo;s
        responses; a win is not guaranteed, and a round may end without a winner.
      </p>

      <h2>8. Conditions.</h2>
      <ul>
        <li>Attempts that try to exploit, manipulate, or inject the system rather than persuade it may be disqualified.</li>
        <li>The Sponsor may modify, suspend, or cancel a round for any reason, including technical failure or suspected fraud.</li>
        <li>No purchase of any FREELON NFT or other asset is required to enter or win.</li>
        <li>This is a game of persuasion against an AI character, not a financial product; nothing here is an investment, and no return, appreciation, or financial benefit is offered or implied.</li>
      </ul>

      <h2>9. Disputes.</h2>
      <p>
        These Official Rules are governed by the laws of [GOVERNING LAW]. By entering, you agree
        these Rules and the Sponsor&rsquo;s decisions are final. [DISPUTE / ARBITRATION TERMS].
      </p>

      <h2>10. Privacy.</h2>
      <p>
        Information submitted is handled per our <a href="/legal/privacy">Privacy Policy</a>. See
        also our <a href="/legal/terms">Terms</a>.
      </p>

      <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-fade)" }}>
        DRAFT — pending attorney review. Bracketed fields must be completed and this structure
        confirmed by counsel before the promotion opens to the public.
      </p>
    </LegalShell>
  );
}

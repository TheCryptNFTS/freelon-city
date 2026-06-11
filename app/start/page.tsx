/**
 * /start — the Dummies Guide.
 *
 * Discord feedback 2026-05-24 from @Munch (via @Lucifer):
 *   "I was massively overwhelmed on the website... most holders are like
 *    that already, just logging in will confuse them."
 *
 * One page, plain English, no jargon until defined. Every section links
 * to the actual place where the user does the thing. Designed for the
 * NEWEST visitor — already-engaged power users can skip it.
 *
 * T6 2026-06-11 split: this page is now ONLY the 2-minute guide (hero,
 * 30-second version, four steps, live/coming, one CTA). Wallet setup +
 * troubleshooting, the daily/weekly routines, the lingo, and the FAQ
 * MOVED verbatim to app/help/page.tsx (/help).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ECONOMY } from "@/lib/economy-constants";
import { TOTAL } from "@/lib/constants";
import { PageBeacon } from "@/components/PageBeacon";
import { TrackedOpenSeaLink } from "@/components/TrackedOpenSeaLink";

// 2026-06-10 — the old hardcoded /og/home.jpg override (wrong 3:2 aspect, off
// the new brand system) is gone; the page now inherits the branded default
// card from app/layout.tsx.
const PAGE_DESC =
  "Two minutes to understand FREELON CITY: own a FREELON, awaken it, and put it to work — its history stays with the NFT.";
// T3 2026-06-11 — explicit share tags (a page-level openGraph block replaces
// the layout's wholesale, so the branded default image is restated here).
export const metadata: Metadata = {
  title: "Start Here · 2-Min Guide",
  description: PAGE_DESC,
  openGraph: {
    title: "Start here — the 2-minute guide",
    description: PAGE_DESC,
    images: [{ url: "/api/og/universe?b=2", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Start here — the 2-minute guide",
    description: PAGE_DESC,
    images: ["/api/og/universe?b=2"],
  },
};

export default function StartPage() {
  return (
    /* Archival visual pass 2026-05-26: .home-page wrapper picks up
       textures + bg from the scoped system + the catch-all override
       in globals.css for inline-styled cards (Section/Box/Step) so
       they flatten to archival surface. No structural edits. */
    <div className="home-page" style={{ maxWidth: 980, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* T11 2026-06-11 — start_viewed funnel event (fire-once client beacon). */}
      <PageBeacon name="start_viewed" />
      {/* ── HERO ── */}
      {/* 2026-05-27 (post-Ogilvy down-funnel): hero rewritten to deliver
         on the homepage h1 promise ("the city remembers what you carry").
         Previous version: defensive ("plain English. No crypto vocabulary
         needed.") + abstract ("the city is big, the steps are small")
         — gave the visitor reassurance, not a reason. New version: states
         what you'll know by the end of the page and what you'll have. */}
      <section className="field-glow" style={{ marginBottom: "var(--s-5)" }}>
        <span className="kicker">⬡ START HERE · 2-MIN TOUR</span>
        <h1 className="page-h1" style={{ margin: "10px 0 14px" }}>
          FREELON CITY is 4,040<br />
          <em>AI characters you own.</em>
        </h1>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 14,
            color: "var(--ink-2)",
            lineHeight: 1.7,
            maxWidth: 620,
          }}
        >
          Here&apos;s the whole thing in one line: <strong style={{ color: "var(--ink)" }}>own a FREELON,
          awaken it with a one-time ETH payment, then train it and put it to work</strong> — transform it into any style,
          give it real jobs, and everything it does becomes a visible work history that stays with the NFT when you sell.
        </p>
        {/* 2026-06-07 de-dupe (founder: "too complex"): the standalone "JUST WANT
            TO START?" gold box duplicated this hero with the same demo button.
            Folded its one action into the hero so the page opens on ONE focal
            box, not two. No wallet needed to look. */}
        <div style={{ marginTop: "var(--s-4)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-lg" href="/demo">
            <span className="ttl">MEET A CITIZEN · FREE →</span>
          </Link>
          <span style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)" }}>
            no wallet needed · everything below is optional reading
          </span>
        </div>
      </section>

      {/* ── 30-SECOND VERSION ──
         2026-05-31: moved ABOVE the "Connecting" section. A newcomer must
         learn WHAT the city is before being handed wallet/MetaMask steps.
         Added the universe paragraph so /start delivers on the homepage
         one-liner's promise (six collections + a card game + an arcade) —
         previously never mentioned anywhere in this guide. */}
      <Section title="The 30-second version">
        <P>
          A <strong style={{ color: "var(--gold)" }}>FREELON</strong> is an AI citizen
          you own and train — one of {TOTAL.toLocaleString()} NFTs on Ethereum. Give it
          jobs (write, strategize, research, red-team) and it levels up, develops a role,
          and builds a <strong style={{ color: "var(--ink)" }}>public work history</strong> that
          stays with the NFT. A trained FREELON is different from a blank one.
        </P>
        <P>
          <strong style={{ color: "var(--gold)" }}>HEX (⬡)</strong> is the shared reward
          layer across the city — credits you earn by being active and spend on actions,
          upgrades, and access. It is not money and not redeemable outside the city.
        </P>
        <P>
          FREELONS are the first of six collections in one city —{" "}
          <strong style={{ color: "var(--ink)" }}>Oogies, The Crypt, Emile, SMILES</strong> and the{" "}
          <strong style={{ color: "var(--ink)" }}>Crypt TCG</strong> card game share the same signal.{" "}
          <Link href="/collections" style={{ color: "var(--gold)" }}>See the universe →</Link>
        </P>
        <P>
          That&apos;s the whole product. <strong>You don&apos;t have to buy anything to look around</strong> —
          but owning a FREELON and awakening it is the part that does real work for you.
        </P>
      </Section>

      {/* "Do I need to buy?" section removed 2026-06-07 — its content (look
          around free vs. own to get the agent) is already covered by "The four
          steps" below + the "Prefer to look around free first?" section. */}

      {/* ── THE FOUR STEPS (citizen-first) ── */}
      <Section title="The four steps">
        <Step
          n="1"
          title="Meet a citizen"
          body="Talk to a live citizen, free, no wallet needed — a real taste of the thing you'd be buying."
          cta={{ label: "MEET A CITIZEN →", href: "/demo" }}
        />
        <Step
          n="2"
          title="Own one"
          body="Find a FREELON you like and buy it on OpenSea. If the exact one you want isn't listed, OpenSea lets you make an offer to its owner. Once it's yours, the character, the levels, and the work history all belong to the NFT."
          cta={{ label: "OPENSEA COLLECTION ↗", href: "https://opensea.io/collection/freelons", external: true, from: "start_steps" }}
        />
        <Step
          n="3"
          title="Awaken it"
          body={`A one-time ETH payment awakens your FREELON — it stays awake through resale — and adds bonus ⬡ to your city balance to spend on jobs. Open your FREELON's page to awaken it.`}
          cta={{ label: "BROWSE CITIZENS →", href: "/citizens" }}
        />
        <Step
          n="4"
          title="Put it to work"
          body="Give it jobs — write, strategy, research, image transforms. It levels up, remembers your project, and builds a public work history that stays with the NFT when you sell."
          cta={{ label: "SEE THE CITY'S RECORDS →", href: "/report" }}
        />
      </Section>

      {/* ── LIVE vs COMING (V1 SIGNAL OS 2026-06-10) ──
         "What's real today" in one glance — unclear live/planned status is a
         documented trust wound (Discord, May 2026). Everything under LIVE runs
         on the site now; COMING means in progress — no dates, no promises. */}
      <Section title="What's live · what's coming">
        <Box>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {[
              "Free demo",
              "Agent workspace",
              "Jobs + XP + public records",
              "Daily ⬡ claim",
              "City games",
              "Crypt TCG · solo vs AI",
            ].map((t) => (
              <span key={t} style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", border: "1px solid var(--gold)", borderRadius: 999, padding: "4px 10px" }}>
                ● LIVE · {t}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {/* Crypt TCG flipped back to LIVE 2026-06-10: the game shipped and
                /crypt-tcg now links the real playable build (solo vs AI).
                Ranked PvP is the remaining COMING beat. */}
            {["Crypt TCG · ranked PvP", "Art evolution (built — activation pending)", "More job types"].map((t) => (
              <span key={t} style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-dim)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 10px" }}>
                ○ COMING · {t}
              </span>
            ))}
          </div>
          <p style={{ marginTop: 12, fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: 0 }}>
            COMING means in progress — no dates, no promises. If it&apos;s not marked LIVE, don&apos;t buy for it.
          </p>
        </Box>
      </Section>

      {/* ── NEED HELP? ──
         T6 2026-06-11: wallet setup + troubleshooting, the daily/weekly
         routines, the lingo, and the FAQ MOVED to /help so this guide reads
         in ~2 minutes. One link stands where they were. */}
      <Section title="Need help?">
        <Box>
          <P>
            Wallet setup and troubleshooting, your daily 60 seconds, the lingo, and the
            questions people actually ask all live on{" "}
            <Link href="/help" style={{ color: "var(--gold)" }}>the help page →</Link>
          </P>
        </Box>
      </Section>

      {/* ── NEXT ──
         2026-05-27 (post-Ogilvy 38-rule scorecard, Rule 37):
         Collapsed three equal-weight CTAs into one primary action.
         The hero promises "claim 10 ⬡ for showing up today" — /sync is
         the path to that promise. /relay (post templates) and /numbers
         (market pulse) were off-funnel exploration buttons that diluted
         the call to action for a first-time visitor finishing the tour.
         Both pages remain reachable from header nav. Secondary explore
         link kept for visitors who genuinely don't want to sync yet. */}
      <section style={{ marginTop: "var(--s-6)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT</span>
        <h2
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(28px, 4vw, 40px)",
            lineHeight: 1.05,
            letterSpacing: "-0.015em",
            margin: "10px 0 var(--s-3)",
          }}
        >
          See what a <em style={{ color: "var(--gold)", fontStyle: "normal" }}>citizen</em> actually does.
        </h2>
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: "var(--s-2)" }}>
          <Link className="btn btn-primary" href="/demo"><span className="ttl">MEET A CITIZEN · FREE →</span></Link>
        </div>
        <p
          style={{
            marginTop: "var(--s-3)",
            fontFamily: "var(--mono2)",
            fontSize: 12,
            color: "var(--ink-dim)",
            letterSpacing: "0.12em",
          }}
        >
          Just want the free {ECONOMY.DAILY_CLAIM} ⬡? <Link href="/sync" style={{ color: "var(--ink-2)", textDecoration: "underline" }}>Sync and claim.</Link>
        </p>
      </section>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────

// T6 2026-06-11: the `collapsible` Section variant (2026-05-31, Munch) left
// with the reference sections it folded — they live on /help now, expanded.
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "var(--s-6)" }}>
      <span className="kicker">⬡ {title.toUpperCase()}</span>
      <div style={{ marginTop: "var(--s-3)" }}>{children}</div>
    </section>
  );
}

/* 2026-06-10 re-skin: Box/Step/Faq move from flat inline rgba boxes onto the
   house premium-panel recipe (globals.css) — /start read like a different,
   cheaper site than the surfaces it onboards people into. Layout-only styles
   stay inline; surface/border/radius come from the recipe. */
function Box({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="panel-premium panel-premium--still"
      style={{
        padding: "var(--s-3) var(--s-4)",
        marginBottom: "var(--s-3)",
      }}
    >
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--mono2)", fontSize: 14, color: "var(--ink)", lineHeight: 1.7, margin: "0 0 12px" }}>
      {children}
    </p>
  );
}

function Step({
  n, title, body, cta,
}: {
  n: string;
  title: string;
  body: string;
  // `from` (T11 2026-06-11): set on OpenSea CTAs to fire the canonical
  // opensea_click {from} funnel event via TrackedOpenSeaLink.
  cta: { label: string; href: string; external?: boolean; from?: string };
}) {
  return (
    <article
      className="panel-premium panel-premium--still"
      style={{
        padding: "var(--s-3) var(--s-4)",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.28em", color: "var(--gold)" }}>STEP {n}</span>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 19, margin: 0, letterSpacing: "-0.005em" }}>{title}</h3>
      </div>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65, margin: "8px 0 12px" }}>
        {body}
      </p>
      {/* Step CTAs are SECONDARY — the page has one primary (SEE AN AGENT) so
          the walkthrough steps don't each compete for the gold treatment. */}
      {cta.external && cta.from ? (
        <TrackedOpenSeaLink className="btn btn-secondary btn-sm" href={cta.href} from={cta.from}>
          <span className="ttl">{cta.label}</span>
        </TrackedOpenSeaLink>
      ) : cta.external ? (
        <a className="btn btn-secondary btn-sm" href={cta.href} target="_blank" rel="noreferrer">
          <span className="ttl">{cta.label}</span>
        </a>
      ) : (
        <Link className="btn btn-secondary btn-sm" href={cta.href}>
          <span className="ttl">{cta.label}</span>
        </Link>
      )}
    </article>
  );
}


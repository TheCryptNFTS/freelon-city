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
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ECONOMY } from "@/lib/economy-constants";
import { TOTAL } from "@/lib/constants";

// 2026-06-10 — the old hardcoded /og/home.jpg override (wrong 3:2 aspect, off
// the new brand system) is gone; the page now inherits the branded default
// card from app/layout.tsx.
const PAGE_DESC =
  "Two minutes to understand FREELON CITY: own a FREELON, awaken it, and put it to work — its history stays with the NFT.";
export const metadata: Metadata = {
  title: "Start Here · 2-Min Guide",
  description: PAGE_DESC,
};

export default function StartPage() {
  return (
    /* Archival visual pass 2026-05-26: .home-page wrapper picks up
       textures + bg from the scoped system + the catch-all override
       in globals.css for inline-styled cards (Section/Box/Step) so
       they flatten to archival surface. No structural edits. */
    <div className="home-page" style={{ maxWidth: 980, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
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
          cta={{ label: "OPENSEA COLLECTION ↗", href: "https://opensea.io/collection/freelons", external: true }}
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

      {/* ── CONNECTING ──
         2026-05-30: added after a wave of Discord reports — X login looping,
         "can't have wallet + X connected at once", and mobile users unable to
         connect at all. The code bugs are fixed; this section heads off the
         remaining USER-side gotcha: on a phone you must use your wallet's
         in-app browser, not Safari/Chrome.
         2026-06-10: moved BELOW the four steps — a newcomer learns what the
         product is before being handed wallet/MetaMask mechanics. */}
      <Section title="Connecting (and staying connected)" collapsible>
        <Box>
          <P>
            You connect <strong style={{ color: "var(--gold)" }}>two things</strong>, and they
            work together — you don&apos;t have to choose:
          </P>
          <Ul>
            <Li><strong>Your wallet</strong> — proves which citizens you hold.</Li>
            <Li><strong>Your X account</strong> — so your posts earn hex.</Li>
          </Ul>
          <p style={{ marginTop: 12, fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65 }}>
            Connect both. They stay connected — wallet for 30 days, X for 7 — so
            closing the tab or coming back later keeps you signed in.
          </p>
        </Box>

        <Box>
          <Strong color="var(--gold)">⬡ On a phone — read this first.</Strong>
          <P>
            Don&apos;t open the site in Safari or Chrome — those can&apos;t talk to your
            wallet, so connecting silently fails. Open it{" "}
            <strong style={{ color: "var(--gold)" }}>inside your wallet&apos;s own browser</strong>:
          </P>
          <Ul>
            <Li><strong>MetaMask:</strong> open the app → tap the ☰ menu → <strong>Browser</strong> → type <strong>www.freeloncity.com</strong>.</Li>
            <Li><strong>Rainbow / Coinbase Wallet:</strong> use the in-app <strong>Browser</strong> / dApps tab the same way.</Li>
          </Ul>
        </Box>

        <Box>
          <Strong color="var(--gold)">⬡ On a computer.</Strong>
          <P>
            Use Chrome, Brave, or Firefox with the <strong>MetaMask</strong> (or Rainbow)
            extension installed, then connect normally.
          </P>
        </Box>

        <Step
          n="A"
          title="Connect your wallet"
          body="Click CONNECT WALLET (top-right, or on the Vault page) and approve in your wallet. Your citizens load — that's wallet connected."
          cta={{ label: "OPEN SYNC →", href: "/sync" }}
        />
        <Step
          n="B"
          title="Sign in with X"
          body="Then click SIGN IN WITH X and approve on X. You bounce back verified. Both stay connected at the same time — connecting one never logs you out of the other."
          cta={{ label: "GO TO SYNC →", href: "/sync" }}
        />

        <Faq q="X keeps sending me back to the login screen — help?">
          Always use the same address: <strong style={{ color: "var(--gold)" }}>www.freeloncity.com</strong> (not the bare freeloncity.com).
          Make sure cookies aren&apos;t blocked for the site — &quot;block all cookies&quot; and some incognito modes break the X sign-in.
          On a phone, use your wallet&apos;s in-app browser (above) and just retry once.
        </Faq>
        <Faq q="Do I have to pick between my wallet and my X account?">
          No. You can — and should — have both connected at once. They&apos;re separate and don&apos;t interfere.
          If X ever looks disconnected after you switch wallets, just reload — your X sign-in persists for 7 days on its own.
        </Faq>
      </Section>

      {/* ── PREFER FREE FIRST? (the city-game, demoted) ──
         The free sync/claim/civ path used to be the primary funnel; it's now
         one collapsed aside so a newcomer isn't taught the game before the
         product. Reachable for anyone who wants the no-wallet hook. */}
      <Section title="Prefer to look around free first?" collapsible>
        <Box>
          <P>No wallet, no purchase — you can still play:</P>
          <Ul>
            <Li><strong>Sync your X handle</strong> on <Link href="/sync" style={{ color: "var(--gold)" }}>/sync</Link> — the city assigns you one of ten civilizations and shows you its patron citizen.</Li>
            <Li><strong>Claim {ECONOMY.DAILY_CLAIM} ⬡ a day</strong> just for showing up. Streaks add more (+{ECONOMY.STREAK_7_BONUS} at 7 days, +{ECONOMY.STREAK_30_BONUS} at 30).</Li>
            <Li><strong>Browse</strong> all {TOTAL.toLocaleString()} citizens and post on the city wall.</Li>
          </Ul>
        </Box>
      </Section>

      {/* ── DAILY 60s ── */}
      <Section title="Your daily 60 seconds" collapsible>
        <Box>
          <Ul>
            <Li>Claim your <strong>+{ECONOMY.DAILY_CLAIM} ⬡</strong> daily on your <Link href="/sync#carrier" style={{ color: "var(--gold)" }}>claim page</Link></Li>
            <Li>Look for the city&apos;s latest X post and reply to it — the first 10 replies in 30 min earn double hex</Li>
            <Li>Glance at /dashboard to see the city&apos;s pulse</Li>
          </Ul>
          <p style={{ marginTop: 12, fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Miss too many days and your background hex pauses. Come back, claim, and it resumes.
          </p>
        </Box>
      </Section>

      {/* ── WEEKLY ── */}
      {/* Audit 2026-05-26: trimmed two bullets that pointed at internal/
         hidden routes — "dump ledger" (drives /graveyard, banned word)
         and "leaderboard" (hidden route). Cold-visitor guide stays
         focused on positive participation. */}
      <Section title="Your weekly 5 minutes" collapsible>
        <Box>
          <Ul>
            <Li>Send a transmission (a mini-post — image + caption) for {`100 ⬡`}. Top weekly transmission earns 5,000 ⬡.</Li>
            <Li>Visit the archive — read which signals connect to your wallet.</Li>
          </Ul>
        </Box>
      </Section>

      {/* ── THE LINGO ── */}
      {/* Audit 2026-05-26: removed three lingo entries that introduced
         degen/floor/dump vocabulary to cold visitors — "ghosted",
         "defender", "rescue". They were the internal price-defense
         mechanic vocabulary. Cold-visitor lingo now keeps only the
         positive identity terms (hex, carrier, citizen, civilization,
         caste, signal, transmission) + adds "archive" to bridge to
         /archive and /combat-archives. */}
      <Section title="The lingo (so nothing is confusing)" collapsible>
        <dl style={{ display: "grid", gap: 12, fontFamily: "var(--mono2)", fontSize: 13 }}>
          <Lingo term="FREELON" def={`The NFT. There are ${TOTAL.toLocaleString()} of them on Ethereum — sealed supply, no more will be made. Each one is an AI citizen you can own and train.`} />
          <Lingo term="awaken" def="A one-time ETH payment that switches your FREELON on. It stays awake through resale — and adds bonus ⬡ to your city balance." />
          <Lingo term="agent" def="What your FREELON is once it's awake — it takes jobs (writing, strategy, research, image transforms), remembers your project, and gets better the more you use it." />
          <Lingo term="hex (⬡)" def="The city's credits. You earn them free or get them when you awaken a FREELON, and spend them to run jobs. Not money, not redeemable outside the city." />
        </dl>
      </Section>

      {/* ── FAQ ── */}
      {/* Audit 2026-05-26: removed three FAQ entries that introduced
         degen vocabulary to cold visitors:
           - "Why is my citizen marked SIGNAL LOST?" (floor/dumps/graveyard)
           - "The site says I'm not a holder but I own citizens" (debugging
             trace, internal — belongs in a help doc, not /start)
           - "I don't want to write tweets myself" (drives /relay, hidden)
         Reframed "Where's the floor / sales / holders?" to ask about the
         city's live numbers without the banned words in the question. */}
      <Section title="Questions people actually ask" collapsible>
        <Faq q="Why didn't my post credit me hex?">
          Posting on X doesn&apos;t auto-credit — you need to either (a) reply to a city post (and be one of the first 10 in 30 min),
          or (b) hit the daily CLAIM button after sharing. Going to your <Link href="/sync#carrier" style={{ color: "var(--gold)" }}>claim page</Link> and pressing CLAIM is what does it.
        </Faq>
        <Faq q="Is hex worth real money?">
          No. Hex is city credits — usable to name citizens, realign, post transmissions, and unlock things on the site.
          It is not a token, not redeemable, not an investment. Hold it because you use it.
        </Faq>
        <Faq q="Where can I see the city's live numbers?">
          <Link href="/dashboard" style={{ color: "var(--gold)" }}>The dashboard</Link> — sealed supply, current state, every receipt. Auto-updated every 5 minutes.
        </Faq>
        <Faq q="How do I safely move my citizens to another wallet?">
          Use the <Link href="/sync#vault" style={{ color: "var(--gold)" }}>vault</Link>. It lets you batch-transfer
          citizens (to cold storage, a fresh wallet, or as a gift) one transaction at a time, with a
          test-send safeguard. The contract is standard ERC-721 so each move is a separate signed
          transaction — but the vault page sequences them and shows live progress so nothing slips.
        </Faq>
        <Faq q="Who runs this?">
          One architect, building daily. See <Link href="/tribute#architect" style={{ color: "var(--gold)" }}>the architect page</Link>.
          Independent, no VC, no exit plan.
        </Faq>
      </Section>

      {/* ── STUCK ── */}
      <Section title="Still stuck?" collapsible>
        <Box>
          <P>
            DM <a href="https://x.com/4040hex" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>@4040hex</a> on X.
            Or hop in <a href="https://discord.gg/xcK3E8nCB8" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>Discord</a>.
            The architect reads every signal.
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

// 2026-05-31 — Discord (Munch, again): the guide built to fix overwhelm
// was itself a wall (9 sections, ~15 terms). `collapsible` lets the
// reference-heavy sections fold shut by default so the page reads as one
// screen — the core path (30-sec / do-I-buy / first-5-min) stays open,
// everything else is one tap away. No copy removed.
function Section({
  title,
  children,
  collapsible = false,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  if (collapsible) {
    return (
      <details className="start-section" style={{ marginBottom: "var(--s-6)" }}>
        <summary
          className="kicker"
          style={{
            cursor: "pointer",
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>⬡ {title.toUpperCase()}</span>
          <span aria-hidden style={{ color: "var(--ink-fade)", fontSize: 12 }}>▾ OPEN</span>
        </summary>
        <div style={{ marginTop: "var(--s-3)" }}>{children}</div>
      </details>
    );
  }
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

function Strong({ children, color = "var(--ink)" }: { children: React.ReactNode; color?: string }) {
  return <strong style={{ color, fontWeight: 700 }}>{children}</strong>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, paddingLeft: 18, margin: "8px 0 0" }}>
      {children}
    </ul>
  );
}
function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ marginBottom: 4 }}>{children}</li>;
}

function Step({
  n, title, body, cta,
}: {
  n: string;
  title: string;
  body: string;
  cta: { label: string; href: string; external?: boolean };
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
      {cta.external ? (
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

function Lingo({ term, def }: { term: string; def: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 180px) 1fr", gap: 14, alignItems: "baseline" }} className="dummies-lingo">
      <dt style={{ color: "var(--gold)", fontWeight: 600, letterSpacing: "0.02em" }}>{term}</dt>
      <dd style={{ color: "var(--ink-2)", margin: 0, lineHeight: 1.55 }}>{def}</dd>
      <style>{`@media (max-width: 540px) { .dummies-lingo { grid-template-columns: 1fr !important; gap: 4px !important; } }`}</style>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details
      className="panel-premium"
      style={{
        padding: "10px var(--s-4)",
        marginBottom: 8,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontFamily: "var(--mono2)",
          fontSize: 13,
          color: "var(--ink)",
          letterSpacing: "0.04em",
          fontWeight: 600,
          listStyle: "none",
        }}
      >
        ⬡ {q}
      </summary>
      <div style={{ marginTop: 10, fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.65 }}>
        {children}
      </div>
    </details>
  );
}

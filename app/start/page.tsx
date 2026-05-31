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

// Phase 1 metadata 2026-05-26 — route-specific text, reuses
// /og/home.jpg.
const PAGE_DESC =
  "Two minutes to understand FREELON CITY. Read the signal, find your civilization, and enter the archive.";
export const metadata: Metadata = {
  title: "Start Here · 2-Min Guide",
  description: PAGE_DESC,
  openGraph: {
    title: "Start Here · 2-Min Guide",
    description: PAGE_DESC,
    images: [{ url: "/og/home.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Start Here · 2-Min Guide",
    description: PAGE_DESC,
    images: ["/og/home.jpg"],
  },
};

export default function StartPage() {
  return (
    /* Archival visual pass 2026-05-26: .home-page wrapper picks up
       textures + bg from the scoped system + the catch-all override
       in globals.css for inline-styled cards (Section/Box/Step) so
       they flatten to archival surface. No structural edits. */
    <div className="home-page" style={{ maxWidth: 820, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* ── HERO ── */}
      {/* 2026-05-27 (post-Ogilvy down-funnel): hero rewritten to deliver
         on the homepage h1 promise ("the city remembers what you carry").
         Previous version: defensive ("plain English. No crypto vocabulary
         needed.") + abstract ("the city is big, the steps are small")
         — gave the visitor reassurance, not a reason. New version: states
         what you'll know by the end of the page and what you'll have. */}
      <section style={{ marginBottom: "var(--s-5)" }}>
        <span className="kicker">⬡ START HERE · 2-MIN TOUR</span>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(40px, 6vw, 64px)",
            lineHeight: 0.96,
            letterSpacing: "-0.02em",
            margin: "10px 0 14px",
          }}
        >
          Two minutes.<br />
          <em style={{ color: "var(--gold)", fontStyle: "normal" }}>One civilization. A daily signal.</em>
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
          By the end of this page you&apos;ll know what FREELON CITY is, which
          civilization you belong to, and how to claim {ECONOMY.DAILY_CLAIM} ⬡
          for showing up today. No wallet required to read on.
        </p>
      </section>

      {/* ── DO THIS ONE THING ──
         2026-05-31: the single first action, above everything. Munch's
         core note was "if they have to do too much to get anywhere they
         give up." So before the 9 sections, one card, one button. The
         detail below is optional — this is the whole ask for a newcomer. */}
      <section
        style={{
          marginBottom: "var(--s-6)",
          padding: "var(--s-4) var(--s-4)",
          border: "1px solid var(--gold)",
          borderTop: "3px solid var(--gold-bright)",
          background: "var(--tint-gold)",
          borderRadius: 14,
          textAlign: "center",
        }}
      >
        <span className="kicker" style={{ color: "var(--gold-bright)" }}>⬡ JUST WANT TO START?</span>
        <h2
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(24px, 4vw, 34px)",
            lineHeight: 1.05,
            letterSpacing: "-0.015em",
            margin: "10px 0 6px",
          }}
        >
          Do one thing: <em style={{ color: "var(--gold)", fontStyle: "normal" }}>sync and claim your {ECONOMY.DAILY_CLAIM} ⬡.</em>
        </h2>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.6,
            maxWidth: 480,
            margin: "0 auto var(--s-3)",
          }}
        >
          Enter your X handle, get your civilization, claim today&apos;s hex. ~30 seconds, no wallet needed.
          Everything below is optional reading for when you want it.
        </p>
        <Link className="btn btn-primary" href="/sync">
          <span className="ttl">SYNC + CLAIM →</span>
        </Link>
      </section>

      {/* ── 30-SECOND VERSION ──
         2026-05-31: moved ABOVE the "Connecting" section. A newcomer must
         learn WHAT the city is before being handed wallet/MetaMask steps.
         Added the universe paragraph so /start delivers on the homepage
         one-liner's promise (six collections + a card game + an arcade) —
         previously never mentioned anywhere in this guide. */}
      <Section title="The 30-second version">
        <P>
          FREELON CITY is a sci-fi city. It has {TOTAL.toLocaleString()} citizens
          (NFTs on Ethereum). Each citizen belongs to one of 10 civilizations.
        </P>
        <P>
          The city pays people in <strong style={{ color: "var(--gold)" }}>hex (⬡)</strong> —
          city credits you earn by being active. You spend hex to name your citizen,
          change civilization, post on the city wall, and unlock things.
        </P>
        <P>
          Freelons is the main collection, but it&apos;s one part of a wider universe:{" "}
          <strong>six collections in all</strong> (Freelons, The Crypt, Combat Archives,
          OOGIES, Emile, SMILES Collapse), a <strong>trading-card game</strong> built on
          Combat Archives, and a free <strong>arcade</strong> of mini-games. One city ties
          them together.
        </P>
        <P>
          <strong>You do NOT have to buy a citizen to play.</strong> You can earn hex,
          pick a civilization, and use most of the site without owning anything.
          Owning a citizen unlocks more.
        </P>
      </Section>

      {/* ── CONNECTING ──
         2026-05-30: added after a wave of Discord reports — X login looping,
         "can't have wallet + X connected at once", and mobile users unable to
         connect at all. The code bugs are fixed; this section heads off the
         remaining USER-side gotcha: on a phone you must use your wallet's
         in-app browser, not Safari/Chrome. */}
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
          <Strong color="var(--gold)">📱 On a phone — read this first.</Strong>
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
          <Strong color="var(--gold)">💻 On a computer.</Strong>
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

      {/* ── DO I NEED TO BUY? ── */}
      <Section title="Do I need to buy a citizen?">
        <Box>
          <Strong color="#7AE08D">No, you don&apos;t.</Strong> Here&apos;s what you can do for free:
          <Ul>
            <Li>Claim <strong>{ECONOMY.DAILY_CLAIM} ⬡ every day</strong> just for showing up</Li>
            <Li>Pick a civilization (a tribe). It assigns based on your X handle.</Li>
            <Li>Post a transmission (a mini-post) on the city wall</Li>
            <Li>Earn hex by sharing posts on X — first 10 replies on a city post get double</Li>
            <Li>Browse all {TOTAL.toLocaleString()} citizens, see who&apos;s ranked top, see the latest sales</Li>
          </Ul>
        </Box>
        <Box>
          <Strong color="var(--gold)">Owning a citizen adds:</Strong>
          <Ul>
            <Li>Naming rights — you choose what your citizen is called on the city site</Li>
            <Li>Civ realignment — switch a citizen to a different tribe</Li>
            <Li>Bigger hex earnings — owning + active beats active alone</Li>
            <Li>Status badges that show up across the site</Li>
            <Li>For the 35 honorary citizens: a private channel page</Li>
          </Ul>
        </Box>
      </Section>

      {/* ── FIRST 5 MINUTES ── */}
      <Section title="Your first 5 minutes (do these in order)">
        <Step
          n="1"
          title="Sync your X handle"
          body="Click SYNC in the header. Enter your X (Twitter) handle. The city assigns you to a civilization based on your name. Free, no wallet needed yet."
          cta={{ label: "GO TO SYNC →", href: "/sync" }}
        />
        <Step
          n="2"
          title="Claim today's hex"
          body={`Once synced, claim your daily +${ECONOMY.DAILY_CLAIM} ⬡. Come back every day to build a streak. 7-day streak adds +${ECONOMY.STREAK_7_BONUS} ⬡. 30-day streak adds +${ECONOMY.STREAK_30_BONUS} ⬡.`}
          cta={{ label: "CLAIM TODAY'S ⬡ →", href: "/carrier" }}
        />
        <Step
          n="3"
          title="Visit your civilization"
          body="See who else is in your tribe. Read the doctrine. Civilizations compete for hex earned — yours rises when you stay active."
          cta={{ label: "MY CIV →", href: "/civilizations" }}
        />
        <Step
          n="4"
          title="Find a citizen you like"
          body={`Browse all ${TOTAL.toLocaleString()} citizens with trait filters (caste, sub-archetype, aura). Look for the ★ RARE badge — those carry trait values that appear on ≤20 other citizens.`}
          cta={{ label: "BROWSE CITIZENS →", href: "/citizens" }}
        />
        <Step
          n="5"
          title="(Optional) Buy one on OpenSea"
          body="When you find a citizen that matches you, click VIEW ON OPENSEA on its page. Owning unlocks the extras above."
          cta={{ label: "OPENSEA COLLECTION ↗", href: "https://opensea.io/collection/freelons", external: true }}
        />
      </Section>

      {/* ── DAILY 60s ── */}
      <Section title="Your daily 60 seconds" collapsible>
        <Box>
          <Ul>
            <Li>Claim your <strong>+{ECONOMY.DAILY_CLAIM} ⬡</strong> on /carrier</Li>
            <Li>Look for the city&apos;s latest X post and reply to it — the first 10 replies in 30 min earn double hex</Li>
            <Li>Glance at /numbers to see the city&apos;s pulse</Li>
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
          <Lingo term="hex (⬡)" def="The city's credits. You earn it. You spend it. It is not money. It is not redeemable for anything outside the city." />
          <Lingo term="carrier" def="Anyone who participates. You don't need to own a citizen to be a carrier." />
          <Lingo term="citizen" def={`An NFT. There are ${TOTAL.toLocaleString()} of them on Ethereum. Sealed supply — no more will be made.`} />
          <Lingo term="civilization" def="Your tribe. There are 10. Your X handle assigns you one when you sync." />
          <Lingo term="caste" def="A citizen's role inside the city. Seven of them." />
          <Lingo term="signal" def="The city's word for anything that moves: a sale, a post, a transmission, a connected archive." />
          <Lingo term="transmission" def="A small post (image + caption) carriers send to the city wall. Burns 100 ⬡ to send. Earns more if it scores." />
          <Lingo term="archive" def="A connected collection the city recognises: The Crypt, Combat Archives, OOGIES, Emile, SMILES. Every archive your wallet carries deepens your record." />
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
          or (b) hit the daily CLAIM button after sharing. Going to <Link href="/carrier" style={{ color: "var(--gold)" }}>/carrier</Link> and pressing CLAIM is what does it.
        </Faq>
        <Faq q="Is hex worth real money?">
          No. Hex is city credits — usable to name citizens, realign, post transmissions, and unlock things on the site.
          It is not a token, not redeemable, not an investment. Hold it because you use it.
        </Faq>
        <Faq q="Where can I see the city's live numbers?">
          <Link href="/numbers" style={{ color: "var(--gold)" }}>Pulse</Link> — sealed supply, current state, every receipt. Auto-updated every 5 minutes.
        </Faq>
        <Faq q="How do I safely move my citizens to another wallet?">
          Use <Link href="/vault" style={{ color: "var(--gold)" }}>/vault</Link>. It lets you batch-transfer
          citizens (to cold storage, a fresh wallet, or as a gift) one transaction at a time, with a
          test-send safeguard. The contract is standard ERC-721 so each move is a separate signed
          transaction — but the vault page sequences them and shows live progress so nothing slips.
        </Faq>
        <Faq q="Who runs this?">
          One architect, building daily. See <Link href="/architect" style={{ color: "var(--gold)" }}>/architect</Link>.
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
          Claim your <em style={{ color: "var(--gold)", fontStyle: "normal" }}>{ECONOMY.DAILY_CLAIM} ⬡</em> for today.
        </h2>
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: "var(--s-2)" }}>
          <Link className="btn btn-primary" href="/sync"><span className="ttl">SYNC + CLAIM →</span></Link>
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
          Not ready? <Link href="/civilizations" style={{ color: "var(--ink-2)", textDecoration: "underline" }}>Browse the ten civilizations first.</Link>
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

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "var(--s-3) var(--s-4)",
        border: "1px solid var(--line)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
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
      style={{
        padding: "var(--s-3) var(--s-4)",
        border: "1px solid var(--line)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
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
      {cta.external ? (
        <a className="btn btn-primary btn-sm" href={cta.href} target="_blank" rel="noreferrer">
          <span className="ttl">{cta.label}</span>
        </a>
      ) : (
        <Link className="btn btn-primary btn-sm" href={cta.href}>
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
      style={{
        padding: "10px var(--s-4)",
        border: "1px solid var(--line)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 10,
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

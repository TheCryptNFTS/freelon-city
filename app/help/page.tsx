/**
 * /help — wallets, routines, lingo.
 *
 * T6 2026-06-11 — split out of /start so the guide reads in ~2 minutes.
 * Everything here MOVED VERBATIM from app/start/page.tsx (restructure,
 * not a rewrite): wallet connection setup + troubleshooting, the daily
 * 60 seconds / weekly 5 minutes routines, the lingo, and the FAQ.
 * Anchor ids (#wallet, #troubleshooting, #daily, #weekly, #lingo, #faq,
 * #stuck) are stable — deep links land here.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ECONOMY } from "@/lib/economy-constants";
import { TOTAL } from "@/lib/constants";

const PAGE_DESC =
  "Wallet connection setup and troubleshooting, your daily and weekly routines, the city's lingo, and the questions people actually ask.";
// A page-level openGraph block replaces the layout's wholesale, so the
// branded default image is restated here (same pattern as /start).
export const metadata: Metadata = {
  title: "Help — wallets, routines, lingo",
  description: PAGE_DESC,
  openGraph: {
    title: "Help — wallets, routines, lingo",
    description: PAGE_DESC,
    images: [{ url: "/api/og/universe?b=2", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Help — wallets, routines, lingo",
    description: PAGE_DESC,
    images: ["/api/og/universe?b=2"],
  },
};

export default function HelpPage() {
  return (
    <div className="home-page" style={{ maxWidth: 980, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* anchor targets sit below the sticky header */}
      <style>{`#wallet, #troubleshooting, #free, #daily, #weekly, #lingo, #faq, #stuck { scroll-margin-top: 64px; }`}</style>

      {/* ── HERO ── */}
      <section className="field-glow" style={{ marginBottom: "var(--s-5)" }}>
        <span className="kicker">⬡ HELP · REFERENCE</span>
        <h1 className="page-h1" style={{ margin: "10px 0 14px" }}>
          Wallets, routines,<br />
          <em>lingo.</em>
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
          Connection setup and troubleshooting, the daily and weekly routines, every term defined,
          and the questions people actually ask. This is the 2-minute guide — start anywhere below.
        </p>
      </section>

      {/* ── CONNECTING ──
         2026-05-30: added after a wave of Discord reports — X login looping,
         "can't have wallet + X connected at once", and mobile users unable to
         connect at all. The code bugs are fixed; this section heads off the
         remaining USER-side gotcha: on a phone you must use your wallet's
         in-app browser, not Safari/Chrome. */}
      <Section id="wallet" title="Connecting (and staying connected)">
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

        <div id="troubleshooting">
          <Faq q="X keeps sending me back to the login screen — help?">
            Always use the same address: <strong style={{ color: "var(--gold)" }}>www.freeloncity.com</strong> (not the bare freeloncity.com).
            Make sure cookies aren&apos;t blocked for the site — &quot;block all cookies&quot; and some incognito modes break the X sign-in.
            On a phone, use your wallet&apos;s in-app browser (above) and just retry once.
          </Faq>
          <Faq q="Do I have to pick between my wallet and my X account?">
            No. You can — and should — have both connected at once. They&apos;re separate and don&apos;t interfere.
            If X ever looks disconnected after you switch wallets, just reload — your X sign-in persists for 7 days on its own.
          </Faq>
        </div>
      </Section>

      {/* ── OWN + AWAKEN ── the buy→awaken path, spelled out (upgrade audit #67).
         The whole flow lived nowhere; newcomers dead-ended on "where do I unlock?". */}
      <Section id="own" title="Own a FREELON and awaken it">
        <Box>
          <P>Owning one is a one-time path. Here&apos;s the whole flow:</P>
          <Ul>
            <Li><strong>Get a crypto wallet</strong> (MetaMask, Rainbow, or Coinbase Wallet) and add a little ETH.</Li>
            <Li><strong>Buy a FREELON on OpenSea</strong> — any one you like. It lands in your wallet.</Li>
            <Li><strong>Come back to <Link href="/my-citizens" style={{ color: "var(--gold)" }}>/my-citizens</Link></strong> and connect that wallet.</Li>
            <Li><strong>Awaken it</strong> — a one-time ETH unlock turns the citizen into a working AI agent: chat, generate images, and a permanent work history that travels with the NFT.</Li>
          </Ul>
          <P>Not sure yet? The free demo shows what an awakened citizen can do — <Link href="/demo" style={{ color: "var(--gold)" }}>try it first</Link>.</P>
        </Box>
      </Section>

      {/* ── PREFER FREE FIRST? (the city-game) ──
         Reachable for anyone who wants the no-wallet hook. */}
      <Section id="free" title="Prefer to look around free first?">
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
      <Section id="daily" title="Your daily 60 seconds">
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
      <Section id="weekly" title="Your weekly 5 minutes">
        <Box>
          <Ul>
            <Li>Send a transmission (a mini-post — image + caption) for {`100 ⬡`}. When others boost it you earn 10% of every boost in ⬡.</Li>
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
      <Section id="lingo" title="The lingo (so nothing is confusing)">
        <dl style={{ display: "grid", gap: 12, fontFamily: "var(--mono2)", fontSize: 13 }}>
          <Lingo term="FREELON" def={`The NFT. There are ${TOTAL.toLocaleString()} of them on Ethereum — sealed supply, no more will be made. Each one is an AI citizen you can own and train.`} />
          <Lingo term="awaken" def="A one-time ETH payment that switches your FREELON on. It stays awake through resale — and adds bonus ⬡ to your city balance." />
          <Lingo term="agent" def="What your FREELON is once it's awake — it takes jobs (writing, strategy, research, image transforms), remembers your project, and gets better the more you use it." />
          <Lingo term="hex (⬡)" def="The city's credits. You earn them free or get them when you awaken a FREELON, and spend them to run jobs. Not money, not redeemable outside the city." />
          <Lingo term="realign" def="Switching a citizen to a different civilization — a ⬡ city-credit sink you spend hex on." />
          <Lingo term="signal" def="The city's core lore — its energy and story; also the name of the weekly Signal Report." />
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
      <Section id="faq" title="Questions people actually ask">
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
      <Section id="stuck" title="Still stuck?">
        <Box>
          <P>
            DM <a href="https://x.com/4040hex" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>@4040hex</a> on X.
            Or hop in <a href="https://discord.gg/xcK3E8nCB8" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>Discord</a>.
            The architect reads every signal.
          </P>
        </Box>
      </Section>
    </div>
  );
}

// ── helpers (moved with the copy from app/start/page.tsx) ──────────

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ marginBottom: "var(--s-6)" }}>
      <span className="kicker">⬡ {title.toUpperCase()}</span>
      <div style={{ marginTop: "var(--s-3)" }}>{children}</div>
    </section>
  );
}

/* 2026-06-10 re-skin: Box/Step/Faq sit on the house premium-panel recipe
   (globals.css). Layout-only styles stay inline; surface/border/radius
   come from the recipe. */
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

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

export const metadata: Metadata = {
  title: "Start Here · FREELON CITY",
  description:
    "Two-minute guide to FREELON CITY. What it is, what you can do today, where everything lives.",
};

export default function StartPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* ── HERO ── */}
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
          A small guide.<br />
          <em style={{ color: "var(--gold)", fontStyle: "normal" }}>The city is big, the steps are small.</em>
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
          Everything here is explained in plain English. No crypto vocabulary needed.
          You don&apos;t have to read it all — pick the section that matches where you are.
        </p>
      </section>

      {/* ── 30-SECOND VERSION ── */}
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
          <strong>You do NOT have to buy a citizen to play.</strong> You can earn hex,
          pick a civilization, and use most of the site without owning anything.
          Owning a citizen unlocks more.
        </P>
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
      <Section title="Your daily 60 seconds">
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
      <Section title="Your weekly 5 minutes">
        <Box>
          <Ul>
            <Li>Send a transmission (a mini-post — image + caption) for {`100 ⬡`}. Top weekly transmission earns 5,000 ⬡.</Li>
            <Li>Check the dump ledger — see who tried to dump, who rescued, what the city remembers</Li>
            <Li>Look at the leaderboard — climb if you can</Li>
          </Ul>
        </Box>
      </Section>

      {/* ── THE LINGO ── */}
      <Section title="The lingo (so nothing is confusing)">
        <dl style={{ display: "grid", gap: 12, fontFamily: "var(--mono2)", fontSize: 13 }}>
          <Lingo term="hex (⬡)" def="The city's credits. You earn it. You spend it. It is not money. It is not redeemable for anything outside the city." />
          <Lingo term="carrier" def="Anyone who participates. You don't need to own a citizen to be a carrier." />
          <Lingo term="citizen" def={`An NFT. There are ${TOTAL.toLocaleString()} of them on Ethereum. Sealed supply — no more will be made.`} />
          <Lingo term="civilization" def="Your tribe. There are 10. Your X handle assigns you one when you sync." />
          <Lingo term="caste" def="A citizen's role inside the city. Seven of them." />
          <Lingo term="signal" def="The city's word for anything that moves: a sale, a post, a transmission, a rescue." />
          <Lingo term="ghosted" def="What happens to a citizen listed way under floor. The city refuses to recognise it until a rescuer buys." />
          <Lingo term="defender" def="A wallet that has never dumped. Defenders earn a small bonus per month of clean record." />
          <Lingo term="transmission" def="A small post (image + caption) carriers send to the city wall. Burns 100 ⬡ to send. Earns more if it scores." />
          <Lingo term="rescue" def="When you buy a ghosted citizen. You earn a bounty. The dumper pays a burn. Both are recorded permanently." />
        </dl>
      </Section>

      {/* ── FAQ ── */}
      <Section title="Questions people actually ask">
        <Faq q="Why is my citizen marked SIGNAL LOST?">
          It got listed for ≤85% of floor for more than 24h. The city refuses to recognise dumps.
          To restore the signal: delist (and wait) or someone rescues it by buying.
          Records live at <Link href="/graveyard" style={{ color: "var(--gold)" }}>/graveyard</Link>.
        </Faq>
        <Faq q="The site says I'm not a holder but I own citizens. What gives?">
          Tell us your wallet — DM @4040hex on X. We&apos;ve fixed the bug in two places already (
          <code>/pfp</code>, <code>/channel</code>) and just fixed it again for the naming form. If it happens elsewhere,
          we want to know.
        </Faq>
        <Faq q="Why didn't my post credit me hex?">
          Posting on X doesn&apos;t auto-credit — you need to either (a) reply to a city post (and be one of the first 10 in 30 min),
          or (b) hit the daily CLAIM button after sharing. Going to <Link href="/carrier" style={{ color: "var(--gold)" }}>/carrier</Link> and pressing CLAIM is what does it.
        </Faq>
        <Faq q="Is hex worth real money?">
          No. Hex is city credits — usable to name citizens, realign, post transmissions, and unlock things on the site.
          It is not a token, not redeemable, not an investment. Hold it because you use it.
        </Faq>
        <Faq q="Where's the floor / sales / holders?">
          <Link href="/numbers" style={{ color: "var(--gold)" }}>/numbers</Link> — all live, auto-updated every 5 minutes.
        </Faq>
        <Faq q="I don't want to write tweets myself.">
          Use <Link href="/relay" style={{ color: "var(--gold)" }}>/relay</Link>. Pre-written templates. Click POST, fill the blanks, done.
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
      <Section title="Still stuck?">
        <Box>
          <P>
            DM <a href="https://x.com/4040hex" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>@4040hex</a> on X.
            Or hop in <a href="https://discord.gg/xcK3E8nCB8" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>Discord</a>.
            The architect reads every signal.
          </P>
        </Box>
      </Section>

      {/* ── NEXT ── */}
      <section style={{ marginTop: "var(--s-6)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT</span>
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: "var(--s-2)" }}>
          <Link className="btn btn-primary" href="/sync"><span className="ttl">SYNC NOW →</span></Link>
          <Link className="btn btn-secondary" href="/relay"><span className="ttl">POST TEMPLATES →</span></Link>
          <Link className="btn btn-secondary" href="/numbers"><span className="ttl">THE NUMBERS →</span></Link>
        </div>
      </section>
    </main>
  );
}

// ── helpers ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

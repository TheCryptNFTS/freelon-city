import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { IdentityGreeting } from "@/components/IdentityGreeting";
import { OtherSignalsStrip } from "@/components/OtherSignalsStrip";
import { CivGlyph } from "@/components/CivGlyph";
import { CIVILIZATIONS, CONTRACT, METADATA_CID, heroImageUrl } from "@/lib/constants";

// Phase 1 metadata 2026-05-26 — route-specific text. Homepage uses
// `title.absolute` to bypass the layout template (otherwise the
// title would become "404 — FREELON CITY · Bring identity back. ·
// FREELON CITY" with the suffix duplicated).
const HOME_DESC =
  "The HEX disappeared. FREELON CITY formed around the signal. 4040 sealed citizens across 10 civilizations.";
export const metadata: Metadata = {
  title: { absolute: "404 — FREELON CITY · Bring identity back." },
  description: HOME_DESC,
  openGraph: {
    title: "404 — FREELON CITY",
    description: HOME_DESC,
    images: [{ url: "/og/home.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "404 — FREELON CITY",
    description: HOME_DESC,
    images: ["/og/home.jpg"],
  },
};

// 2026-05-26: cookies() inside the page already forces dynamic
// rendering implicitly. Declaring it explicitly here protects the
// cookie-aware CTA branch from a future refactor that might
// accidentally re-enable static generation. Verified in production
// headers: cache-control: private, no-cache, no-store on /.
export const dynamic = "force-dynamic";
// Audit 2026-05-25 — homepage mythic compression. Removed from homepage
// render + imports: DoThisNow (quest-board energy), CityTerminal
// (dashboard above the fold), HonoreeStrip (celeb pfp grid in hero),
// LiveStats (FLOOR/HOLDERS/MINTED stats inside hero), WalletScanner +
// signal-check section (duplicate of /archive scanner). All components
// still live at their own routes — only the homepage surface is
// stripped. Final homepage spine: Hero → OtherSignalsStrip →
// Civilizations → Pull quote + ENTER CTA → On-chain footer.
// Phase 3/4 historical: also removed from this file's commented blocks
// — WHY FREELON, CivWarBoard, Four One-of-Ones, honoree band, featured
// citizens, TopPatronsStrip, RecentTransmissions. Imports/locals
// previously kept for those (getOneOfOnes/getAllCitizens/getHonoraries
// /imageUrl/getUsdPerEth/hexToUsdLabel/ONE_OF_ONE_TAGLINES) are gone
// now that compression is final. To restore any section, revert the
// commented blocks AND re-add the matching import.

export default async function Home() {
  // Audit 2026-05-26: cookie-aware CTA swap. Cold visitors (no
  // freelon_addr cookie) get START HERE as primary so they land on
  // the 2-minute guide that defines hex / signal / civilization /
  // burn vocabulary before they need it. Returning visitors keep
  // ENTER THE CITY as primary so the funnel they already understand
  // stays one click away.
  const cookieStore = await cookies();
  const isReturning = !!cookieStore.get("freelon_addr")?.value;
  return (
    /* Audit 2026-05-26: .home-page wrapper triggers the scoped
       archival visual system in globals.css. No structure change. */
    <div className="home-page">
      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div>
            {/* Live identity greeting — wallet-aware. For known viewers
                the page transforms into a personal experience (civ color,
                handle, citizen count, hex balance). */}
            <IdentityGreeting />

            {/* Brand badge */}
            <span className="term-badge flicker"><span className="dot" />404 HEX NOT FOUND</span>

            {/* Hero headline locked to founder brief 2026-05-25:
                Title = "404 HEX NOT FOUND" (carried by the term-badge above).
                H1 = "The HEX disappeared." subtext + "FREELON CITY formed
                around the signal." */}
            <h1 className="hero-headline">
              The HEX<br />
              <em>disappeared.</em>
            </h1>
            <p className="hero-sub">
              FREELON CITY formed around the signal.
              <br />
              <strong>4040 citizens</strong> · 10 civilizations · sealed supply.
            </p>

            {/* Audit 2026-05-26: inline glosses for the 3 most-confusing
               terms a cold visitor reads in their first 30 seconds. /start
               has full definitions; this is the minimum vocabulary primer
               for everyone who doesn't click /start. Designed as one quiet
               line — dust mono, low contrast — so it teaches without
               competing with the H1. */}
            <p className="hero-gloss">
              <em>404 HEX NOT FOUND</em> — X removed the hex from verified profiles. The city formed around its absence.<br />
              <em>The signal</em> — the city's word for anything that moves: a sale, a connected archive, a transmission.<br />
              <em>Sealed supply</em> — 4040 NFTs on Ethereum. No more will ever be made.
            </p>

            {/* Audit 2026-05-26: cookie-aware CTA swap. Cold visitor →
               START HERE primary (drives them to the page that defines
               every term they just read). Returning visitor → ENTER THE
               CITY primary (one click into the funnel they already know).
               Secondary CTA always points at the other path. */}
            <div className="hero-ctas">
              {isReturning ? (
                <>
                  <Link href="/sync" className="btn btn-primary">
                    <span className="ttl">ENTER THE CITY <span className="ar">→</span></span>
                  </Link>
                  <Link
                    href="/start"
                    className="new-here-pill new-here-pill--hero"
                    aria-label="New here? Start with the 2-minute guide"
                  >
                    <span aria-hidden>⬡</span>
                    <span>NEW HERE? · 2-MIN GUIDE</span>
                    <span aria-hidden>→</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/start" className="btn btn-primary">
                    <span className="ttl">START HERE · 2-MIN GUIDE <span className="ar">→</span></span>
                  </Link>
                  <Link
                    href="/sync"
                    className="new-here-pill new-here-pill--hero"
                    aria-label="Already know the city? Enter directly."
                  >
                    <span aria-hidden>⬡</span>
                    <span>ALREADY HERE · ENTER</span>
                    <span aria-hidden>→</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <style>{`
          .new-here-pill {
            display: inline-flex; align-items: center; gap: 8px;
            margin: 10px 0 6px;
            padding: 6px 14px;
            border-radius: 999px;
            border: 1px solid var(--gold);
            background: rgba(200,167,93,0.10);
            color: var(--gold);
            font-family: var(--mono2);
            font-size: 10px;
            letter-spacing: 0.26em;
            text-transform: uppercase;
            font-weight: 700;
            text-decoration: none;
            transition: background 120ms ease, transform 120ms ease;
          }
          .new-here-pill:hover { background: rgba(200,167,93,0.20); transform: translateY(-1px); }
          /* Inline glosses for the 3 most-confusing terms in the hero.
             Quiet treatment — dust mono on archival ash card, smaller
             than the hero body. Sits between hero-sub and hero-ctas. */
          .hero-gloss {
            margin: 14px 0 18px;
            padding: 12px 16px;
            border: 1px solid var(--archival-line, rgba(232,224,207,0.12));
            border-left: 2px solid var(--archival-rule-gold, rgba(200,163,90,0.22));
            background: var(--archival-surface, rgba(17,16,14,0.65));
            border-radius: 6px;
            max-width: 540px;
            font-family: var(--mono2);
            font-size: 12px;
            line-height: 1.85;
            color: var(--archival-dust, var(--ink-dim));
          }
          .hero-gloss em {
            color: var(--archival-bone, var(--ink));
            font-style: normal;
            font-weight: 700;
          }
          /* 2026-05-26 mobile fold fix: on <760px the hero stacks
             with the image above content. Two changes together:
             (1) reorder .hero-gloss to bottom so CTAs sit directly
             under the sub-headline,
             (2) shrink the hero image min-height from 56vh → 42vh
             so there's enough room for the headline + sub + CTAs
             above the fold on 844px viewports. The image still
             dominates the first impression at 42vh (~354px); we
             just stop letting it eat the CTAs. */
          @media (max-width: 760px) {
            .hero-left > div {
              display: flex;
              flex-direction: column;
            }
            .hero-left > div .hero-gloss {
              order: 1;
              margin-top: 18px;
              margin-bottom: 0;
            }
            .hero-right {
              min-height: 42vh !important;
            }
            /* Tighten vertical rhythm on mobile so primary CTA lands
               within one thumb-scroll. globals.css sets the hero-left
               gap to var(--s-7) = 48px and the mobile padding to
               56px/80px — combined that's >250px of whitespace before
               you reach the CTA. Compressing here doesn't touch
               desktop. */
            .hero-left {
              padding: 28px 20px 36px !important;
              gap: 16px !important;
            }
          }
        `}</style>
        <div className="hero-right">
          <div className="img-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img src={heroImageUrl(4040)} alt="FREELON CITY #4040 — THE FINAL SIGNAL" fetchPriority="high" decoding="async" />
          </div>
          <div className="img-overlay" />
          <div className="img-id">
            4040<small>ONE OF ONE · ETH</small>
          </div>
          <div className="img-stamp">
            ⬡ THE FOURTH BRACKET
            <h2>The Final <em>Signal</em></h2>
          </div>
          <div className="img-meta">
            VOID 404 · SANCTUM<br />
            FACE — TRANSMISSION LOCKED
          </div>
        </div>
      </section>

      {/* OTHER SIGNALS · ARCHIVE strip — the universe bridge. */}
      <OtherSignalsStrip />

      {/* SIGNAL RECOGNITION — the ownership-answer bridge. 2026-05-26.
         Sits between OtherSignalsStrip (what exists) and Civilizations
         (who you belong to). Answers "why own?" without saying buy/
         hold/utility. One sacred line + one CTA to /archive. All
         styling lives in .home-page__recognition (globals.css). */}
      <section className="home-page__recognition" aria-label="Signal recognition">
        <span className="home-page__recognitionKicker">⬡ SIGNAL RECOGNITION</span>
        <h2 className="home-page__recognitionHeading">
          The city remembers<br />
          <em>what you carry.</em>
        </h2>
        <p className="home-page__recognitionBody">
          Citizens. Dead signals. Combat relics. Ancient species.<br />
          Memory fragments. Collapse records.<br />
          <strong>Six signals. One record. Yours.</strong>
        </p>
        <Link href="/archive" className="home-page__recognitionLink">
          ⬡ READ YOUR SIGNAL →
        </Link>
      </section>

      {/* HOMEPAGE COMPRESSION 2026-05-25 — hard cut 15→7 sections per
          founder brief: "Make FREELON CITY understandable in under 10
          seconds while preserving mystery. Push deeper lore into
          discovery layers instead of homepage clutter."
          Sections removed (still live at their deep links, just no
          longer competing for hero attention):
          - WHY FREELON (4 mechanic cards) → lives at /earn
          - CivWarBoard → lives at /civ-wars
          - The Four One-of-Ones → lives at /citizens + each vanity URL
          - Honoree band → lives at /tribute
          - Featured citizens → lives at /citizens
          - TopPatronsStrip → lives at /patrons
          - RecentTransmissions → lives at /transmissions + Pulse
          Commented-out rather than deleted so we can restore any if
          the bare-bones homepage tests as too thin.
       */}
      {/*
      <section className="why-freelon">
        <span className="kicker">⬡ THE LEDGER</span>
        <h2 className="why-headline">
          We&apos;re all building the city.<br />
          <em>Hex flows to the ones who carry it.</em>
        </h2>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 580, margin: "0 auto var(--s-4)", textAlign: "center" }}>
          The city isn&apos;t a product — it&apos;s a thing we build together.
          Snipe red signals, sweep the floor, sell into liquidity, post daily.
          Sit still for 14 days and the meter pauses. The city remembers what you carried.
        </p>
        <div className="why-grid">
          <Link href="/earn" className="why-card scan-card" style={{ "--accent": "var(--gold)" } as React.CSSProperties}>
            <div className="why-stat">
              <span className="why-num">+500⬡</span>
              <span className="why-unit">per snipe · <em style={{ fontStyle: "normal", opacity: 0.85 }}>{hexToUsdLabel(500, usdPerEth)}</em></span>
            </div>
            <div className="why-body">
              <span className="why-no">01 · SNIPE</span>
              <h3>Snipe a <span style={{ color: "var(--state-danger)" }}>Red Signal</span></h3>
              <p>Listings priced ≤ 90% of floor get flagged. Buy one, hold 14 days, the city pays the spread in hex — up to +500⬡ per snipe.</p>
            </div>
          </Link>
          <Link href="/earn" className="why-card scan-card" style={{ "--accent": "var(--signal-blue)" } as React.CSSProperties}>
            <div className="why-stat">
              <span className="why-num">+25⬡</span>
              <span className="why-unit">per sweep · <em style={{ fontStyle: "normal", opacity: 0.85 }}>{hexToUsdLabel(25, usdPerEth)}</em></span>
            </div>
            <div className="why-body">
              <span className="why-no">02 · BUY</span>
              <h3>Sweep a citizen on OpenSea</h3>
              <p>The city credits 25 hex per buy. Three sweeps inside 24h adds +100⬡.</p>
            </div>
          </Link>
          <Link href="/earn" className="why-card scan-card" style={{ "--accent": "var(--mars-rust)" } as React.CSSProperties}>
            <div className="why-stat">
              <span className="why-num">+10⬡</span>
              <span className="why-unit">per share · <em style={{ fontStyle: "normal", opacity: 0.85 }}>{hexToUsdLabel(10, usdPerEth)}</em></span>
            </div>
            <div className="why-body">
              <span className="why-no">03 · SHARE</span>
              <h3>Share the daily signal on X</h3>
              <p>Once per day. 7-day streak = +100⬡. 30-day streak = +500⬡. The city remembers loyalty.</p>
            </div>
          </Link>
          <Link href="/patrons" className="why-card scan-card" style={{ "--accent": "var(--signal-red)" } as React.CSSProperties}>
            <div className="why-stat">
              <span className="why-num">100⬡</span>
              <span className="why-unit">to start · <em style={{ fontStyle: "normal", opacity: 0.85 }}>{hexToUsdLabel(100, usdPerEth)}</em></span>
            </div>
            <div className="why-body">
              <span className="why-no">04 · BURN</span>
              <h3>Carve your name into the city</h3>
              <p>Burn hex to name your citizen, realign your civ, or post your name on the Patrons Wall for 7 days.</p>
            </div>
          </Link>
        </div>
        <div className="why-trust">
          <span className="dot" />
          <strong>4040 citizens</strong> · <strong>10 civilizations</strong> ·
          <strong>16 sacred shapes</strong> · <strong>4 one-of-ones</strong> ·
          <strong>35 honoraries</strong> · contract <code>{CONTRACT.slice(0, 6)}…{CONTRACT.slice(-4)}</code>
        </div>
      </section>

      <CivWarBoard />
      */}

      {/* Phase 3: removed AlertsFeed (dup of CityFeedTicker marquee),
         HexIndexHero (dup of CityTerminal Hex Index panel),
         DailySignal (dup of CityTerminal Today's Signal panel),
         CitizenOfDay (low-frequency moment, lives at /citizens),
         BecomeACarrier (dup of /start funnel + DoThisNow sync card),
         DailyMission (dup of DoThisNow claim card). */}

      {/* SIGNAL CHECK section removed 2026-05-25 — the wallet scanner is
         the signature interaction but its proper home is /archive (the
         ownership terminal). Two scanners on adjacent surfaces was
         fragmenting the brand's signature moment. */}

      {/* Phase 4 compression 2026-05-25: Four One-of-Ones section
         hidden — visitors discover them through /citizens (now the
         first section there) + the 4 vanity URLs. Hero already
         carries the brand. */}
      {/*
      <section className="sec-four reveal">
        <div className="section-bar">
          <div className="left-col">
            <span className="kicker">FOUR CITIZENS · BRACKETS OF THE CITY</span>
            <h2>Four <em>singular</em> citizens</h2>
          </div>
          <Link className="more" href="/citizens">VIEW ALL CITIZENS →</Link>
        </div>
        <div className="oneof-grid">
          {ones.map((o) => {
            const civ = (CIVILIZATIONS as Record<string, { color: string; name: string }>)[o.civilization];
            const vanity: Record<number, string> = { 1: "origin-signal", 404: "patient-zero", 1337: "genesis-hex", 4040: "the-final-signal" };
            const href = vanity[o.id] ? `/${vanity[o.id]}` : `/citizens/${o.id}`;
            return (
              <Link key={o.id} href={href} className="oneof-card relic-card scan-card" style={{ "--civ": civ?.color } as React.CSSProperties}>
                <div className="img-frame"><img src={heroImageUrl(o.id)} alt={o.name} loading="lazy" /></div>
                <div className="row"><span className="id">#{o.id.toString().padStart(4, "0")}</span><span className="tag" style={{ color: civ?.color }}>1 / 1 · {civ?.name.split(" ")[0].toUpperCase()}</span></div>
                <h3>{o.transmission_name || o.name}</h3>
                <p className="role">{ONE_OF_ONE_TAGLINES[o.id] || ""}</p>
              </Link>
            );
          })}
        </div>
      </section>
      */}

      {/* CIVILIZATIONS */}
      <section className="civs-section reveal">
        <div className="section-bar" style={{ paddingTop: "var(--s-9)" }}>
          <div className="left-col">
            <span className="kicker">TEN SIGNAL DOCTRINES</span>
            <h2>Ten <em>civilizations</em></h2>
          </div>
          <Link className="more" href="/civilizations">ENTER A CIVILIZATION →</Link>
        </div>
        <div className="civ-grid">
          {Object.entries(CIVILIZATIONS).map(([slug, c]) => (
            <Link
              key={slug}
              href={`/civilizations/${slug}`}
              style={{ "--civ": c.color } as React.CSSProperties}
            >
              <div className="top" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CivGlyph slug={slug} color={c.color} size={22} title={c.name} />
                <span className="idx">{c.stamp}</span>
                <span className="name">{c.doctrine}</span>
              </div>
              <span className="pop">{c.population}</span>
              <p className="role">{c.role}</p>
              <span className="chant">⬡ {c.chant}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Phase 4 compression 2026-05-25: honoree band + featured
         citizens + TopPatrons + RecentTransmissions all hidden from
         homepage. They live at /tribute, /citizens, /patrons,
         /transmissions. Hero + DoThisNow + GoodValueToSweep +
         OtherSignals + CityTerminal + Civilizations + SignalCheck
         already cover HEX/CITY/SIGNAL — these were noise. */}
      {/*
      <section className="honoree-band reveal">
        <div className="section-bar">
          <div className="left-col"><span className="kicker">35 TRIBUTES · NAMED AFTER THE SIGNAL CARRIERS</span><h2>The <em>honoraries</em></h2></div>
          <Link className="more" href="/tribute">SEE ALL 35 →</Link>
        </div>
        <div className="honoree-grid">
          {honoraries.slice(0, 7).map((h) => (
            <Link key={h.id} href={`/tribute/${(h.honoree_handle || "").replace(/^@/, "") || h.id}`} className="honoree-cell">
              <img src={imageUrl(h.id)} alt={h.honoree} loading="lazy" />
              <div className="meta"><div className="name">{h.honoree}</div><div className="handle">{h.honoree_handle}</div></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="featured-band reveal">
        <div className="section-bar">
          <div className="left-col"><span className="kicker">EIGHT OF FOUR THOUSAND FORTY</span><h2>8 <em>citizens</em><br />4,032 more behind them</h2></div>
          <Link className="more" href="/citizens">BROWSE ALL 4040 →</Link>
        </div>
        <div className="featured-grid">
          {featured.slice(0, 8).map((c) => {
            const civ = (CIVILIZATIONS as Record<string, { color: string; doctrine: string }>)[c.civilization];
            return (
              <Link key={c.id} href={`/citizens/${c.id}`} className="cell" style={{ "--civ": civ?.color } as React.CSSProperties}>
                <img src={imageUrl(c.id)} alt={c.name} loading="lazy" />
                <div className="id"><div className="top-row"><span>#{c.id.toString().padStart(4, "0")}</span><span className="dot" /></div><div className="civ-name">{civ?.doctrine.toUpperCase()} · {c.tier.toUpperCase()}</div></div>
              </Link>
            );
          })}
        </div>
      </section>

      <TopPatronsStrip />
      <RecentTransmissions />
      */}

      {/* PULL QUOTE */}
      <section className="pull reveal">
        <q>
          The platform removed the frame.<br />
          The people <em>became</em> the frame.
        </q>
        {/* Attribution "⬡ FREELON CITY · FINAL TRANSMISSION" removed
           2026-05-25 — self-quoting your own brand as scripture was a
           tell. The quote stands on its own. */}
        {/* CTA below the closer — best line on the site shouldn't dead-end.
            Single button, single instruction, brand voice. */}
        <div style={{ marginTop: "var(--s-5)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/sync">
            <span className="lbl">JOIN THE FRAME</span>
            <span className="ttl">ENTER THE CITY <span className="ar">⬡ →</span></span>
          </Link>
          <Link className="btn btn-secondary" href="/start">
            <span className="ttl">NEW HERE? · 2-MIN GUIDE →</span>
          </Link>
        </div>
      </section>

      {/* ON-CHAIN */}
      <section className="onchain reveal">
        <div style={{ marginBottom: "var(--s-5)" }}>
          <span className="kicker">ON-CHAIN</span>
          <h2 style={{ marginTop: "var(--s-3)" }}>Truths that <em>don&apos;t move</em></h2>
        </div>
        <div className="trinity">
          <div className="cell">
            <span className="lbl">CONTRACT — ETHEREUM MAINNET</span>
            <a className="val" target="_blank" rel="noopener noreferrer" href={`https://etherscan.io/address/${CONTRACT}`}>
              {(CONTRACT.slice(0, 8) + "…" + CONTRACT.slice(-6)).toUpperCase()} ↗
            </a>
            <span className="sub">ONE LINE OF SOLIDITY · ZERO REVISIONS.</span>
          </div>
          <div className="cell">
            <span className="lbl">METADATA — IPFS CID</span>
            <a className="val" target="_blank" rel="noopener noreferrer" href={`https://ipfs.io/ipfs/${METADATA_CID}`}>
              {(METADATA_CID.slice(0, 12) + "…" + METADATA_CID.slice(-8)).toUpperCase()} ↗
            </a>
            <span className="sub">SEALED · PINNED · UNREMOVABLE.</span>
          </div>
          <div className="cell">
            <span className="lbl">MARKETPLACE</span>
            <a className="val" target="_blank" rel="noopener noreferrer" href="https://opensea.io/collection/freelons">
              OPENSEA · /FREELONS ↗
            </a>
            <span className="sub">SECONDARY ROYALTIES · 5%</span>
          </div>
        </div>
      </section>
    </div>
  );
}


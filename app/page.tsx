import Link from "next/link";
import { DoThisNow } from "@/components/DoThisNow";
import { IdentityGreeting } from "@/components/IdentityGreeting";
import { FloorPill } from "@/components/FloorPill";
import { HonoreeStrip } from "@/components/HonoreeStrip";
import { HoldTheLineBanner } from "@/components/HoldTheLineBanner";
import { CityTerminal } from "@/components/CityTerminal";
import { GoodValueToSweep } from "@/components/GoodValueToSweep";
import { OtherSignalsStrip } from "@/components/OtherSignalsStrip";
import { CivGlyph } from "@/components/CivGlyph";
import { getUsdPerEth, hexToUsdLabel } from "@/lib/eth-price";
import { WalletScanner } from "@/app/sync/WalletScanner";
import { LiveStats } from "@/components/LiveStats";
import { RecentTransmissions } from "@/components/RecentTransmissions";
import { CivWarBoard } from "@/components/CivWarBoard";
import { TopPatronsStrip } from "@/components/TopPatronsStrip";
import { getOneOfOnes, getAllCitizens, getHonoraries } from "@/lib/citizens";
import { CIVILIZATIONS, CONTRACT, METADATA_CID, imageUrl, heroImageUrl } from "@/lib/constants";
// REMOVED in Phase 3 (redundant with CityTerminal + DoThisNow):
//   BecomeACarrier (dup of /start funnel) · DailySignal (dup of CityTerminal panel)
//   DailyMission (dup of DoThisNow) · AlertsFeed (dup of CityFeedTicker marquee)
//   HexIndexHero (dup of CityTerminal panel) · CitizenOfDay (low-frequency moment)

const ONE_OF_ONE_TAGLINES: Record<number, string> = {
  1:    "Origin Signal does not lead. Origin Signal is.",
  404:  "The moment before the collapse, captured and held.",
  1337: "If the hex made it into stone — Genesis Hex made sure of it.",
  4040: "When the city ends, this is who turns out the lights.",
};

export default async function Home() {
  const ones = getOneOfOnes();
  const honoraries = getHonoraries();
  const all = getAllCitizens();
  const featured = Object.keys(CIVILIZATIONS).flatMap((slug) => {
    const inCiv = all.filter((c) => c.civilization === slug && c.tier !== "One of One" && c.tier !== "Honorary");
    return inCiv.slice(0, 2);
  }).slice(0, 16);
  // USD anchor for the mechanic cards — solves the "hex is fictional
  // currency until proven otherwise" CRO finding. 1h cached server-side.
  const usdPerEth = await getUsdPerEth();

  return (
    <main>
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

            {/* Live floor + 24h delta + holders. The category + price
                anchor lives HERE — so the headline below stays the iconic
                lore line (which the hero typography was sized for). */}
            <FloorPill />

            {/* Iconic lore headline — fits the existing type system
                because each line is short. Category info is carried by
                the FloorPill directly above. */}
            <h1 className="hero-headline">
              The hex didn&apos;t<br />
              disappear<br />
              <em>It moved</em>
            </h1>
            <p className="hero-sub">
              The HEX disappeared. FREELON CITY formed around the signal.
              <br />
              <strong>4040 citizens</strong> · 10 civilizations · sealed supply.
              Hold one — the city pays daily in hex.
            </p>

            {/* Two CTAs side-by-side: SYNC (free-to-play) + BUY (revenue).
                Discord 2026-05-25 (Lady Magic): newcomers think they need
                to spend money. Hero now leads with the no-cost path so
                "what do I have to lose?" is answered before the buy CTA. */}
            <div className="hero-ctas">
              <Link href="/sync" className="btn btn-primary">
                <span className="lbl">FREE TO PLAY</span>
                <span className="ttl">SYNC + CLAIM 10⬡ <span className="ar">→</span></span>
              </Link>
              <a
                className="btn btn-secondary"
                href="https://opensea.io/collection/freelons"
                target="_blank"
                rel="noreferrer"
              >
                <span className="lbl">OR HOLD A CITIZEN</span>
                <span className="ttl">VIEW ON OPENSEA <span className="ar">↗</span></span>
              </a>
              <Link
                href="/start"
                className="new-here-pill new-here-pill--hero"
                aria-label="New here? Start with the 2-minute guide"
              >
                <span aria-hidden>⬡</span>
                <span>NEW HERE? · 2-MIN GUIDE</span>
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/archive"
                className="new-here-pill new-here-pill--hero"
                aria-label="Access the Archives — other signals before the city"
                style={{ borderColor: "var(--state-active)", color: "var(--state-active)" }}
              >
                <span aria-hidden>⬡</span>
                <span>ACCESS THE ARCHIVES</span>
                <span aria-hidden>→</span>
              </Link>
            </div>
            <p
              style={{
                marginTop: 12,
                fontFamily: "var(--mono2)",
                fontSize: 11,
                color: "var(--ink-dim)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                maxWidth: 480,
              }}
            >
              ⬡ NO WALLET NEEDED TO START · NO PURCHASE TO EARN ⬡
            </p>

            {/* Honoree thumbnails — Vitalik / Beeple / punk6529 / xcopy
                as social proof bar. Pros: fastest trust signal a stranger
                could get and we already have the assets. */}
            <HonoreeStrip max={7} />
          </div>
          <LiveStats />
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

      {/* DO THIS NOW · personalized funnel — promoted to top of the
          post-hero stack in Phase 3. The personalized "what should I do
          next" answer lands BEFORE the Bloomberg state panel because
          the user wants action, not analytics, first. */}
      <DoThisNow />

      {/* GOOD VALUE TO SWEEP — addresses Discord 2026-05-25 WitschiDaD:
          "is there better ones to sweep up or are they all equal?"
          Live red-signal listings + the citizen's computed VALUE score
          per card. Newcomer-friendly: tells you exactly which listings
          are underpriced relative to rarity, without having to manually
          scan all 4040. */}
      <GoodValueToSweep />

      {/* OTHER SIGNALS · ARCHIVE strip — founder brief 2026-05-25.
          5 archive cards visible on the homepage so visitors discover
          the wider universe before scrolling past. Each card uses the
          locked copy from the brief; the strip links to /archive for
          the full transmission set + OpenSea provenance. */}
      <OtherSignalsStrip />

      {/* HOLD THE LINE banner — distributed bid wall mission. Live
          defender count builds social proof as it fills. */}
      <HoldTheLineBanner />

      {/* STATE OF THE CITY · Bloomberg-style live terminal panel.
          Moved below DoThisNow + HoldTheLine in Phase 3 so personal
          action + collective mission land first. The terminal answers
          "what's happening right now" once you've seen what to do. */}
      <CityTerminal />

      {/* WHY FREELON · simple cards, plain English */}
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

      {/* CIVILIZATION WAR SCOREBOARD — live tribal gameplay.
          Highest-engagement element after the mechanic announces. */}
      <CivWarBoard />

      {/* Phase 3: removed AlertsFeed (dup of CityFeedTicker marquee),
         HexIndexHero (dup of CityTerminal Hex Index panel),
         DailySignal (dup of CityTerminal Today's Signal panel),
         CitizenOfDay (low-frequency moment, lives at /citizens),
         BecomeACarrier (dup of /start funnel + DoThisNow sync card),
         DailyMission (dup of DoThisNow claim card). */}

      {/* SIGNAL CHECK · the signature interaction */}
      <section className="signal-check reveal">
        <span className="kicker">⬡ SIGNAL CHECK · THE CITY DETECTS YOU</span>
        <h2>Paste a wallet.<br /><em>The signal locates you.</em></h2>
        <p className="signal-check-sub">
          Address, ENS, or X handle. The city scans your holdings, reads your
          civ alignment, calculates hex pressure, returns your passport.
        </p>
        <div style={{ maxWidth: 640, margin: "var(--s-4) auto 0" }}>
          <WalletScanner />
        </div>
      </section>

      {/* THE FOUR ONE-OF-ONES */}
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
              <Link
                key={o.id}
                href={href}
                className="oneof-card relic-card scan-card"
                style={{ "--civ": civ?.color } as React.CSSProperties}
              >
                <div className="img-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroImageUrl(o.id)} alt={o.name} loading="lazy" />
                </div>
                <div className="row">
                  <span className="id">#{o.id.toString().padStart(4, "0")}</span>
                  <span className="tag" style={{ color: civ?.color }}>1 / 1 · {civ?.name.split(" ")[0].toUpperCase()}</span>
                </div>
                <h3>{o.transmission_name || o.name}</h3>
                <p className="role">{ONE_OF_ONE_TAGLINES[o.id] || ""}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Phase 3: removed STATEMENT block — its 6 stats are already
         carried by the .why-trust strip inside WHY FREELON above. */}

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

      {/* HONOREE BAND */}
      {/* HONOREES — compact teaser (7 instead of 14). Full grid lives at /tribute. */}
      <section className="honoree-band reveal">
        <div className="section-bar">
          <div className="left-col">
            <span className="kicker">35 TRIBUTES · NAMED AFTER THE SIGNAL CARRIERS</span>
            <h2>The <em>honoraries</em></h2>
          </div>
          <Link className="more" href="/tribute">SEE ALL 35 →</Link>
        </div>
        <div className="honoree-grid">
          {honoraries.slice(0, 7).map((h) => (
            <Link
              key={h.id}
              href={`/tribute/${(h.honoree_handle || "").replace(/^@/, "") || h.id}`}
              className="honoree-cell"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(h.id)} alt={h.honoree} loading="lazy" />
              <div className="meta">
                <div className="name">{h.honoree}</div>
                <div className="handle">{h.honoree_handle}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED CITIZENS — 8 instead of 16, browse CTA does the work */}
      <section className="featured-band reveal">
        <div className="section-bar">
          <div className="left-col">
            <span className="kicker">EIGHT OF FOUR THOUSAND FORTY</span>
            <h2>8 <em>citizens</em><br />4,032 more behind them</h2>
          </div>
          <Link className="more" href="/citizens">BROWSE ALL 4040 →</Link>
        </div>
        <div className="featured-grid">
          {featured.slice(0, 8).map((c) => {
            const civ = (CIVILIZATIONS as Record<string, { color: string; doctrine: string }>)[c.civilization];
            return (
              <Link
                key={c.id}
                href={`/citizens/${c.id}`}
                className="cell"
                style={{ "--civ": civ?.color } as React.CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(c.id)} alt={c.name} loading="lazy" />
                <div className="id">
                  <div className="top-row">
                    <span>#{c.id.toString().padStart(4, "0")}</span>
                    <span className="dot" />
                  </div>
                  <div className="civ-name">{civ?.doctrine.toUpperCase()} · {c.tier.toUpperCase()}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TOP PATRONS · 7-DAY BURN */}
      <TopPatronsStrip />

      {/* RIVALRIES — moved to /lore where they get full context. Single CTA only. */}

      {/* RECENT TRANSMISSIONS */}
      <RecentTransmissions />

      {/* PULL QUOTE */}
      <section className="pull reveal">
        <q>
          The platform removed the frame.<br />
          The people <em>became</em> the frame.
        </q>
        <div className="cred">⬡ FREELON CITY · FINAL TRANSMISSION</div>
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
    </main>
  );
}


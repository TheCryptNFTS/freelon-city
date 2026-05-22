import Link from "next/link";
import { CityFeedTicker } from "@/components/CityFeedTicker";
import { InlineSync } from "@/components/InlineSync";
import { LiveStats } from "@/components/LiveStats";
import { RecentTransmissions } from "@/components/RecentTransmissions";
import { CivWarBoard } from "@/components/CivWarBoard";
import { DailySignal } from "@/components/DailySignal";
import { DailyMission } from "@/components/DailyMission";
import { TopPatronsStrip } from "@/components/TopPatronsStrip";
import { AlertsFeed } from "@/components/AlertsFeed";
import { HexIndexHero } from "@/components/HexIndexHero";
import { CitizenOfDay } from "@/components/CitizenOfDay";
import { getOneOfOnes, getAllCitizens, getHonoraries } from "@/lib/citizens";
import { CIVILIZATIONS, CONTRACT, METADATA_CID, imageUrl, heroImageUrl } from "@/lib/constants";

const ONE_OF_ONE_TAGLINES: Record<number, string> = {
  1:    "Origin Signal does not lead. Origin Signal is.",
  404:  "The moment before the collapse, captured and held.",
  1337: "If the hex made it into stone — Genesis Hex made sure of it.",
  4040: "When the city ends, this is who turns out the lights.",
};

export default function Home() {
  const ones = getOneOfOnes();
  const honoraries = getHonoraries();
  const all = getAllCitizens();
  const featured = Object.keys(CIVILIZATIONS).flatMap((slug) => {
    const inCiv = all.filter((c) => c.civilization === slug && c.tier !== "One of One" && c.tier !== "Honorary");
    return inCiv.slice(0, 2);
  }).slice(0, 16);

  return (
    <main>
      <CityFeedTicker />
      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div>
            <span className="term-badge flicker"><span className="dot" />404 HEX NOT FOUND</span>
            <h1 className="hero-headline">
              The hex didn&apos;t<br />
              disappear<br />
              <em>It moved</em>
            </h1>
            <p className="hero-sub">
              <strong>4040 citizens</strong> on Ethereum. 10 civilizations.
              Supply sealed. Hold one — the city pays you in hex daily.
              Burn hex — carve your name into the wall.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-primary" href="/sync">
                <span className="lbl">FIND YOUR PLACE</span>
                <span className="ttl">CHECK YOUR WALLET <span className="ar">⬡ →</span></span>
              </Link>
              <Link className="btn btn-secondary" href="/citizens">
                <span className="lbl">4040 ON CHAIN</span>
                <span className="ttl">EXPLORE CITIZENS <span className="ar">→</span></span>
              </Link>
            </div>
          </div>
          <LiveStats />
        </div>
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

      {/* WHY FREELON · simple cards, plain English */}
      <section className="why-freelon">
        <span className="kicker">⬡ THE LEDGER</span>
        <h2 className="why-headline">
          Hold a citizen.<br />
          <em>The city pays in hex</em>
        </h2>
        <div className="why-grid">
          <Link href="/earn" className="why-card scan-card" style={{ "--accent": "var(--gold)" } as React.CSSProperties}>
            <div className="why-stat">
              <span className="why-num">+500⬡</span>
              <span className="why-unit">per snipe</span>
            </div>
            <div className="why-body">
              <span className="why-no">01 · SNIPE</span>
              <h3>Snipe a 🔴 Red Signal</h3>
              <p>Listings priced ≤ 90% of floor get flagged. Buy one, hold 7 days, the city pays the spread in hex — up to +500⬡ per snipe.</p>
            </div>
          </Link>
          <Link href="/earn" className="why-card scan-card" style={{ "--accent": "var(--signal-blue)" } as React.CSSProperties}>
            <div className="why-stat">
              <span className="why-num">+25⬡</span>
              <span className="why-unit">per sweep</span>
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
              <span className="why-unit">per share</span>
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
              <span className="why-unit">to start</span>
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

      {/* 404 ALERTS · LIVE SIGNAL FEED */}
      <AlertsFeed />

      {/* HEX INDEX · MASTER NUMBER */}
      <HexIndexHero />

      {/* DAILY SIGNAL */}
      <DailySignal />

      {/* 404TH CITIZEN OF THE DAY */}
      <CitizenOfDay />

      {/* DAILY MISSION */}
      <DailyMission />

      {/* SIGNAL CHECK · the main first action */}
      <section className="signal-check reveal">
        <span className="kicker">⬡ SIGNAL CHECK</span>
        <h2>The city detects you<br /><em>Find your place</em></h2>
        <p className="signal-check-sub">
          Paste a wallet or sync your X handle. The city locates your citizens,
          reads your civilization, returns your hex balance.
        </p>
        <InlineSync />
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

      {/* STATEMENT */}
      <section className="statement reveal">
        <div className="grid">
          <div>
            <span className="kicker">⬡ THE NUMBERS ARE THE CITY</span>
            <h2 className="lead">
              One contract<br />
              4040 souls<br />
              The signal moves <em>through us</em>
            </h2>
          </div>
          <div className="stat-row">
            <Stat n="4040" l="Citizens, all minted" />
            <Stat n="10" l="Civilizations" />
            <Stat n="7" l="Castes" />
            <Stat n="16" l="Sacred shapes" />
            <Stat n="35" l="Honorary tributes" />
            <Stat n="4" l="One-of-ones" />
          </div>
        </div>
      </section>

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
              <div className="top">
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
      <section className="honoree-band reveal">
        <div className="section-bar">
          <div className="left-col">
            <span className="kicker">35 TRIBUTES · NAMED AFTER THE SIGNAL CARRIERS</span>
            <h2>The <em>honoraries</em></h2>
          </div>
          <Link className="more" href="/tribute">SEND A TRIBUTE TWEET →</Link>
        </div>
        <div className="honoree-grid">
          {honoraries.slice(0, 14).map((h) => (
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

      {/* FEATURED CITIZENS */}
      <section className="featured-band reveal">
        <div className="section-bar">
          <div className="left-col">
            <span className="kicker">SIXTEEN OF FOUR THOUSAND FORTY</span>
            <h2>16 <em>citizens</em><br />4,024 more behind them</h2>
          </div>
          <Link className="more" href="/citizens">BROWSE ALL 4040 →</Link>
        </div>
        <div className="featured-grid">
          {featured.map((c) => {
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

      {/* CIVILIZATION WAR SCOREBOARD */}
      <CivWarBoard />

      {/* TOP PATRONS · 7-DAY BURN */}
      <TopPatronsStrip />

      {/* RIVALRIES */}
      <section className="rivalries-section reveal">
        <div className="section-bar">
          <div className="left-col">
            <span className="kicker">FIVE NAMED RIVALRIES · TEN DOCTRINES AT WAR</span>
            <h2>The civilizations <em>do not agree</em></h2>
          </div>
          <Link className="more" href="/lore">READ THE LORE →</Link>
        </div>
        <div className="rivalries-grid">
          {(() => {
            const seen = new Set<string>();
            const pairs: Array<{ a: string; b: string }> = [];
            for (const [slug, civ] of Object.entries(CIVILIZATIONS)) {
              const rival = (civ as { rival?: string }).rival;
              if (!rival) continue;
              const key = [slug, rival].sort().join("|");
              if (seen.has(key)) continue;
              seen.add(key);
              pairs.push({ a: slug, b: rival });
              if (pairs.length >= 5) break;
            }
            return pairs.map(({ a, b }) => {
              const civA = (CIVILIZATIONS as Record<string, { name: string; color: string; doctrine: string; rivalLine?: string }>)[a];
              const civB = (CIVILIZATIONS as Record<string, { name: string; color: string; doctrine: string }>)[b];
              if (!civA || !civB) return null;
              return (
                <Link key={`${a}-${b}`} href="/lore" className="rivalry-card">
                  <div className="rivalry-card-pair">
                    <span className="side" style={{ color: civA.color }}>{civA.name.split(" ").slice(-1)[0].toUpperCase()}</span>
                    <span className="cross">⬡</span>
                    <span className="side" style={{ color: civB.color }}>{civB.name.split(" ").slice(-1)[0].toUpperCase()}</span>
                  </div>
                  <p className="rivalry-card-line">&ldquo;{civA.rivalLine}&rdquo;</p>
                  <div className="rivalry-card-meta">
                    <span style={{ color: civA.color }}>{civA.doctrine.toUpperCase()}</span>
                    <span className="sep">VS</span>
                    <span style={{ color: civB.color }}>{civB.doctrine.toUpperCase()}</span>
                  </div>
                </Link>
              );
            });
          })()}
        </div>
      </section>

      {/* RECENT TRANSMISSIONS */}
      <RecentTransmissions />

      {/* PULL QUOTE */}
      <section className="pull reveal">
        <q>
          The platform removed the frame.<br />
          The people <em>became</em> the frame.
        </q>
        <div className="cred">⬡ FREELON CITY · FINAL TRANSMISSION</div>
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

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="stat">
      <span className="n">{n}</span>
      <span className="l">{l}</span>
    </div>
  );
}

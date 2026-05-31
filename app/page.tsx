import type { Metadata } from "next";
import Link from "next/link";
import { IdentityGreeting } from "@/components/IdentityGreeting";
import { HeroMarketStat } from "@/components/HeroMarketStat";
import { ResponsiveGrid } from "@/components/ui/ResponsiveGrid";
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

// 2026-05-28: the landing was rebuilt to 4 static intent-doors over a
// full-bleed city backdrop — the cookie-aware CTA swap (and its
// cookies() call) is gone. Kept force-dynamic so the wallet-aware
// client islands (IdentityGreeting / HeroMarketStat) never get baked
// into a stale static shell.
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

export default function Home() {
  return (
    /* Audit 2026-05-26: .home-page wrapper triggers the scoped
       archival visual system in globals.css. No structure change. */
    <div className="home-page">
      {/* HERO — 2026-05-28 rebuilt (founder: "4 clean boxes and that epic
          background", cut the giant text wall). Full-bleed Mars-city
          backdrop; the 4 intent-doors ARE the hero. The old giant "THE CITY
          REMEMBERS" headline + split panel + gloss are gone — Box 1 ("What
          is this?") carries comprehension; the mythic line lives on in
          /canon, not as a homepage wall. */}
      <section className="hero--landing" aria-label="FREELON CITY">
        {/* Full-bleed Mars-city backdrop + dark gradient live in
            .hero--landing (globals.css). Everything below sits in one
            centered column over it. */}
        <div className="hero-landing__inner">
          {/* Live identity greeting — wallet-aware. For known viewers
              the page transforms into a personal experience (civ color,
              handle, citizen count, hex balance). */}
          <IdentityGreeting />

          <span className="term-badge flicker"><span className="dot" />404 HEX NOT FOUND</span>

          {/* 2026-05-28 — the giant "THE CITY REMEMBERS" headline + 3-line
              gloss + split image panel were cut per founder ("4 clean boxes
              and that epic background"). One short tagline states what this
              is; the 4 doors do the rest, over the full-bleed city. */}
          <p className="hero-landing__tag">
            A city formed around a missing signal.<br />
            <strong>4040 sealed citizens · 10 civilizations.</strong>
          </p>

          {/* The 4 intent-doors ARE the landing. Box 1 (start) + Box 4
              (collect) cover the cold/returning split the old cookie swap
              used to handle. Box 3 → /signal (the cross-collection
              "your signal across the universe" portfolio). */}
          <div className="hero-landing__boxes">
            <ResponsiveGrid cols={4} colsMd={2} variant="cards">
              <Link className="landing-box" href="/start">
                <span className="landing-box__img" style={{ backgroundImage: "url(/lore/city.webp)" }} aria-hidden />
                <span className="landing-box__body">
                  <span className="landing-box__k">⬡ 01 · New here</span>
                  <h2 className="landing-box__t">What is this?</h2>
                  <p className="landing-box__d">4040 sealed citizens across 10 civilizations — a city that formed around a missing hex.</p>
                  <span className="landing-box__cta">The 2-minute guide</span>
                </span>
              </Link>
              <Link className="landing-box" href="/civilizations">
                <span className="landing-box__img" style={{ backgroundImage: "url(/civs/gold-sovereignty.webp)" }} aria-hidden />
                <span className="landing-box__body">
                  <span className="landing-box__k">⬡ 02 · Belong</span>
                  <h2 className="landing-box__t">Your civilization</h2>
                  <p className="landing-box__d">Ten signal doctrines. Every citizen belongs to one. Find yours.</p>
                  <span className="landing-box__cta">See the ten</span>
                </span>
              </Link>
              <Link className="landing-box" href="/signal">
                <span className="landing-box__img" style={{ backgroundImage: "url(/atmos/carrier.webp)" }} aria-hidden />
                <span className="landing-box__body">
                  <span className="landing-box__k">⬡ 03 · Your signal</span>
                  <h2 className="landing-box__t">Everything you hold</h2>
                  <p className="landing-box__d">Your citizens, relics and signals across all six collections of the Crypt — one place.</p>
                  <span className="landing-box__cta">Read your signal</span>
                </span>
              </Link>
              <Link className="landing-box" href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer">
                <span className="landing-box__img" style={{ backgroundImage: "url(/heroes/0404.webp)" }} aria-hidden />
                <span className="landing-box__body">
                  <span className="landing-box__k">⬡ 04 · Collect</span>
                  <h2 className="landing-box__t">Own a citizen</h2>
                  <p className="landing-box__d">4040 sealed. No more will ever be made. Enter on OpenSea.</p>
                  <span className="landing-box__cta">On OpenSea</span>
                </span>
              </Link>
            </ResponsiveGrid>
          </div>

          {/* 2026-05-28 collector pass (founder: "lean in") — live floor
              + sealed-supply line under the doors. Client-side fetch, never
              blocks the hero LCP. */}
          <HeroMarketStat />
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

      {/* Compressed homepage spine. Earlier iterations of this file
         carried ~200 LOC of commented-out JSX blocks (WHY FREELON,
         CivWarBoard, Four One-of-Ones, honoree band, featured citizens,
         TopPatronsStrip, RecentTransmissions) preserved as "revert
         switches" after the 2026-05-25 mythic compression. Those
         components moved to components/_archive/ on 2026-05-26 with
         a README explaining how to restore one. The commented JSX
         blocks were pruned here so the active spine reads cleanly.
         To restore a section: see components/_archive/README.md. */}

      {/* CIVILIZATIONS */}
      <section className="civs-section reveal">
        <div className="section-bar" style={{ paddingTop: "var(--s-9)" }}>
          <div className="left-col">
            <span className="kicker">TEN SIGNAL DOCTRINES</span>
            <h2>Ten <em>civilizations</em></h2>
          </div>
          <Link className="more" href="/civilizations">ENTER A CIVILIZATION →</Link>
        </div>
        <div
          className="civ-grid"
          role="region"
          aria-label="The ten civilizations — scroll horizontally to explore"
          tabIndex={0}
        >
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
            Single button, single instruction, brand voice. 2026-05-31: the
            secondary "NEW HERE · 2-MIN GUIDE" button was removed — it
            duplicated hero Box 01 (/start) and the redundant CTA pair was
            part of the "too much / minefield" feeling (Discord, Munch). */}
        <div style={{ marginTop: "var(--s-5)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/sync">
            <span className="lbl">JOIN THE FRAME</span>
            <span className="ttl">ENTER THE CITY <span className="ar">⬡ →</span></span>
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


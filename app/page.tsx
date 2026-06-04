import type { Metadata } from "next";
import Link from "next/link";
import { IdentityGreeting } from "@/components/IdentityGreeting";
import { HeroVideo } from "@/components/HeroVideo";
import { CitizenShowcase } from "@/components/CitizenShowcase";
import { HeroMarketStat } from "@/components/HeroMarketStat";
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
    // 2026-05-31 — dynamic universe card (names the six collections + arcade
    // up front) replaces the single-PFP /og/home.jpg, so the very first thing
    // a shared link previews is the SCOPE, not "another Freelons drop".
    title: "404 — FREELON CITY",
    description: HOME_DESC,
    images: [{ url: "/api/og/universe", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "404 — FREELON CITY",
    description: HOME_DESC,
    images: ["/api/og/universe"],
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
            .hero--landing (globals.css). The static image now drifts; drop
            a trailer (components/HeroVideo.tsx) to replace it with motion.
            Everything below sits in one centered column over it. */}
        <HeroVideo />
        <div className="hero-landing__inner">
          {/* Live identity greeting — wallet-aware. For known viewers
              the page transforms into a personal experience (civ color,
              handle, citizen count, hex balance). */}
          <IdentityGreeting />

          {/* 2026-06-03 FREELONS-FIRST FUNNEL (founder restructure): the product
              value prop is the FIRST thing, in plain words a newcomer gets in
              ~10 seconds. Lore moved below. Three actions only. The structured
              ecosystem lives in its own section further down, not as competing
              chips up here. */}
          <h1 className="hero-landing__h1">
            FREELONS are 4,040 <strong>trainable AI agents</strong> you own.
          </h1>
          <p className="hero-landing__tag">
            Give your FREELON jobs. It levels up, develops a role, and builds a work history that
            stays with the NFT.
          </p>
          <p className="hero-landing__rhythm">Train it. Level it. Use it. Trade it.</p>

          {/* THREE actions, no more. Own (buy) · Try (see a live agent) · Earn (free hook). */}
          <div className="hero-landing__cta hero-cta-row">
            <Link className="btn btn-primary btn-lg" href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer">
              <span className="ttl">OWN A FREELON <span className="ar">→</span></span>
            </Link>
            <Link className="btn btn-secondary btn-lg" href="/citizens/1">
              <span className="ttl">TRY AN AGENT →</span>
            </Link>
            <Link className="btn btn-secondary btn-lg" href="/earn">
              <span className="ttl">EARN HEX →</span>
            </Link>
          </div>
          <Link className="hero-landing__newhere" href="/start">New here? The 2-minute guide →</Link>

          {/* Lore flavour, now SECONDARY (below the value prop + actions). */}
          <span className="term-badge flicker" style={{ marginTop: "var(--s-5)" }}><span className="dot" />THE HEX VANISHED · CYCLE 0404</span>

          {/* 2026-05-28 collector pass — live floor + sealed-supply line.
              Client-side fetch, never blocks the hero LCP. */}
          <HeroMarketStat />
        </div>
      </section>

      {/* ── WHY OWN A FREELON? — the money explanation, in plain words, right
          under the hero. Filetree styling matches the brand's terminal voice.
          Copy is deliberately careful: "more useful / more desirable", visible
          work history, trained vs blank — no investment / appreciation claims. */}
      <section className="why-own reveal">
        <span className="kicker">⬡ WHY OWN A FREELON?</span>
        <ul className="filetree">
          <li>It does jobs for you</li>
          <li>It levels up through use</li>
          <li>It develops a role</li>
          <li>It builds a visible work history</li>
          <li>That history stays with the NFT</li>
          <li>A trained FREELON is different from a blank one</li>
        </ul>
      </section>

      {/* ── HOW IT WORKS — the loop in six steps + the six roles a FREELON can
          grow into. */}
      <section className="how-it-works reveal">
        <span className="kicker">⬡ HOW IT WORKS</span>
        <ol className="how-steps">
          {[
            "Own a FREELON",
            "Give it jobs",
            "It earns XP",
            "It develops a role",
            "Its work history grows",
            "Keep using it — or sell it later as a trained agent",
          ].map((s, i) => (
            <li key={i}><span className="how-n">{String(i + 1).padStart(2, "0")}</span>{s}</li>
          ))}
        </ol>
        <div className="how-roles">
          <span className="how-roles-lbl">ROLES IT CAN GROW INTO</span>
          <div className="how-roles-row">
            {["Writer", "Strategist", "Sales Agent", "Researcher", "Designer", "Red Team"].map((r) => (
              <span key={r} className="how-role">{r}</span>
            ))}
          </div>
        </div>
        <Link className="btn btn-primary" href="/citizens/1"><span className="ttl">TRY AN AGENT →</span></Link>
      </section>

      {/* CITIZEN SHOWCASE — the homepage finally shows the product. A
          4040-PFP project that displayed zero Freelons couldn't "show, not
          tell"; this slow band of real portraits (1/1s + honoraries) fixes
          that the moment a visitor scrolls past the hero. */}
      <CitizenShowcase />

      {/* ── THE ECOSYSTEM — only AFTER FREELONS are understood. A simple tree:
          FREELONS first, then HEX (the reward layer), then the branches. Each
          line is one plain sentence; deep lore lives a layer down. */}
      <section className="ecosystem-tree reveal" id="ecosystem">
        <span className="kicker">⬡ THE ECOSYSTEM</span>
        <h2>One city, <em>five parts</em></h2>
        <ul className="eco-tree">
          <li>
            <Link href="/citizens"><strong>FREELONS</strong></Link>
            <span>Trainable AI agents you upskill and can trade.</span>
          </li>
          <li>
            <Link href="/earn"><strong>HEX</strong></Link>
            <span>The shared reward layer across the city. Use the ecosystem, earn HEX, spend it on actions, upgrades and access.</span>
          </li>
          <li>
            <Link href="/collections/emile0x1908"><strong>EMILE</strong></Link>
            <span>The creative and emotional branch — fun, memory, imagination, storytelling.</span>
          </li>
          <li>
            <Link href="/crypt-tcg"><strong>TCG + CRYPT OGs</strong></Link>
            <span>Game assets for the card-game branch — battles, strategy, collection.</span>
          </li>
          <li>
            <Link href="/collections/oogies"><strong>OOGIES</strong></Link>
            <span>The hidden utility branch. More coming.</span>
          </li>
        </ul>
      </section>

      {/* OTHER SIGNALS · ARCHIVE strip — the universe bridge. */}
      <OtherSignalsStrip />

      {/* SIGNAL RECOGNITION section removed from homepage 2026-05-31 (ruthless
         simplification). It stacked 6 jargon nouns (Citizens / Dead signals /
         Combat relics / Ancient species / Memory fragments / Collapse records)
         on a newcomer before they understood the product — a core contributor
         to the "too much / too complex" feeling. The /archive scanner it
         pointed to is still reachable via the More nav. Restore by reverting
         this block if the bridge is missed. */}

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


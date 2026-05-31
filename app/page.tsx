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

          {/* 2026-05-31 — was "404 HEX NOT FOUND", which mimics an HTTP 404
              error string and read as a broken page to first-time visitors
              (the single first line of text on the site). Reframed to a
              status badge that pairs with the one-liner directly below
              ("When the HEX vanished…"). Keeps the 0404 brand number; drops
              the "NOT FOUND" error mimicry. */}
          <span className="term-badge flicker"><span className="dot" />THE HEX VANISHED · CYCLE 0404</span>

          {/* 2026-05-31 — the one-liner now sells the UNIVERSE, not just the
              4040 PFPs (founder: "we dont just have freelons as a collection").
              Mythic opener → plain-English scope so a stranger gets the WHOLE
              thing in one read. The chip row below names the pieces at low
              visual weight; the OWN button stays the single primary action. */}
          <p className="hero-landing__tag">
            When the HEX vanished, a city formed around the signal — six collections, a trading-card war, and an arcade.<br />
            <strong>One universe. 4040 citizens deep.</strong>
          </p>

          {/* Scope chips — names the universe's pieces in one scannable row so
              the one-liner's "six collections + arcade" is concrete, not vague.
              2026-05-31: now clickable (scope legibility) — each chip routes to
              where that piece actually lives, so a newcomer can explore the
              universe instead of just reading its parts. Still low-contrast so
              they don't compete with the OWN button. */}
          <div className="hero-landing__scope" aria-label="Explore the universe" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginTop: "var(--s-4)" }}>
            {/* 2026-05-31 — each chip routes to a DISTINCT destination.
                Originally all of Crypt/OOGIES/Emile/SMILES pointed at /archive
                (founder: "everything you click into is the same information on
                EVERY page"); they briefly deep-linked to OpenSea. They now land
                on their own on-site explorer (/collections/<slug>) — a full
                trait browser like the Freelons one — so the whole universe is
                browsable in-city. */}
            {[
              { name: "Freelons", href: "/citizens", ext: false },
              { name: "The Crypt", href: "/collections/the-crypt-official", ext: false },
              { name: "Combat Archives", href: "/combat-archives", ext: false },
              { name: "OOGIES", href: "/collections/oogies", ext: false },
              { name: "Emile", href: "/collections/emile0x1908", ext: false },
              { name: "SMILES Collapse", href: "/collections/smiles-genesis", ext: false },
              { name: "Arcade", href: "/play", ext: false },
            ].map((c) => (
              <Link
                key={c.name}
                href={c.href}
                {...(c.ext ? { target: "_blank", rel: "noreferrer" } : {})}
                className="universe-chip"
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: "var(--t-mono-xxs)",
                  letterSpacing: "var(--tr-loose)",
                  textTransform: "uppercase",
                  color: "var(--ink-dim)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-pill)",
                  padding: "4px 10px",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                {c.name}
              </Link>
            ))}
          </div>

          {/* 2026-05-31 ruthless simplification (founder: "too much / too
              complex to understand", Discord echo "minefield"). The 4
              competing intent-doors were collapsed to ONE primary action —
              own a Freelon on OpenSea — with a single quiet "new here" link
              for comprehension. The other former doors (/civilizations,
              /signal) are not deleted: they live in the More nav. This is
              the single-button hero the whole funnel now points at. */}
          <div className="hero-landing__cta" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--s-4)", marginTop: "var(--s-6)" }}>
            <Link className="btn btn-primary btn-lg" href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer">
              <span className="lbl">⬡ 4040 SEALED · NONE WILL EVER BE MADE</span>
              <span className="ttl">OWN A FREELON <span className="ar">→</span></span>
            </Link>
            <Link className="hero-landing__newhere" href="/start" style={{ fontFamily: "var(--mono2)", fontSize: "var(--t-mono-sm)", letterSpacing: "var(--tr-loose)", textTransform: "uppercase", color: "var(--ink-2)" }}>
              New here? The 2-minute guide →
            </Link>
          </div>

          {/* 2026-05-28 collector pass (founder: "lean in") — live floor
              + sealed-supply line under the doors. Client-side fetch, never
              blocks the hero LCP. */}
          <HeroMarketStat />
        </div>
      </section>

      {/* CITIZEN SHOWCASE — the homepage finally shows the product. A
          4040-PFP project that displayed zero Freelons couldn't "show, not
          tell"; this slow band of real portraits (1/1s + honoraries) fixes
          that the moment a visitor scrolls past the hero. */}
      <CitizenShowcase />

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


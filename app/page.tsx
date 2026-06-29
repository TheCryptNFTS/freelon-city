import type { Metadata } from "next";
import Link from "next/link";
import { preload } from "react-dom";
import { HeroVideo } from "@/components/HeroVideo";
import { ActivationProof } from "@/components/ActivationProof";
import { MarsBand } from "@/components/MarsBand";
import { CryptTcgBand } from "@/components/CryptTcgBand";
import { CitizensBand } from "@/components/CitizensBand";
import { CitizenMosaic } from "@/components/CitizenMosaic";
import { ProductDoors } from "@/components/ProductDoors";
import { TrackedOpenSeaLink } from "@/components/TrackedOpenSeaLink";
import { TrackedLink } from "@/components/TrackedLink";
import { PageBeacon } from "@/components/PageBeacon";

// Phase 1 metadata 2026-05-26 — route-specific text. Homepage uses
// `title.absolute` to bypass the layout template (otherwise the
// title would become "404 — FREELON CITY · Bring identity back. ·
// FREELON CITY" with the suffix duplicated).
// Product-first (P1, 2026-06-09): this is the most-shared/indexed text (meta +
// OG + Twitter), so it must deliver the pitch, not lore. Matches the canonical
// 10-second line + the on-page hero subline. Lore lives on the page, not here.
const HOME_DESC =
  "A living AI civilization, on-chain since 2023. Every face is a living AI citizen — meet one free, then own and train it. Its whole life travels with the NFT.";
export const metadata: Metadata = {
  // 2026-06-17 (Algorithm review): the cold-facing browser/Google title must not
  // say "404" — a stranger reads it as a dead link. The 404 motif stays in the
  // on-page header + interior easter eggs; share/OG title was already de-404'd.
  title: { absolute: "FREELON CITY — a living AI civilization" },
  description: HOME_DESC,
  openGraph: {
    // 2026-06-10 — /api/og/universe with NO query serves the branded FreelonCard
    // (portrait + "AN AI CHARACTER YOU OWN" + pitch). The six-collections scope
    // card still exists behind ?v=universe but nothing links it — the product
    // card wins for cold traffic, deliberately.
    // T3 2026-06-11 — share title sells the product; og:title "404 — FREELON
    // CITY" previewed as a broken page on X. The 404 motif stays on-page and
    // inside the OG image renderer, never in the share-card title tags.
    title: "FREELON CITY — a living AI civilization",
    description: HOME_DESC,
    images: [{ url: "/api/og/universe?b=2", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FREELON CITY — a living AI civilization",
    description: HOME_DESC,
    images: ["/api/og/universe?b=2"],
  },
};

// 2026-05-28: the landing was rebuilt to 4 static intent-doors over a
// full-bleed city backdrop — the cookie-aware CTA swap (and its
// cookies() call) is gone. The wallet-aware bits (IdentityGreeting /
// HeroMarketStat) were also removed, so nothing on the server side reads
// cookies/headers anymore.
// 2026-06-21 (page audit): with no server-side dynamic deps left, force-dynamic
// only cost us a re-render on every hit. Flipped to ISR — client islands still
// hydrate wallet-aware on the client; the static shell is fine.
export const revalidate = 600;
// 2026-06-04 — AGENTS-ONLY homepage (founder: "agents are the main thing").
// The newcomer-path simplification stripped everything that wasn't the agent
// pitch. Current spine: Hero → Why own → How it works → CitizenShowcase →
// closing CTA. Removed from the homepage (each still lives at its own route,
// reachable via the Explore ▾ menu): the ecosystem tree, OtherSignalsStrip
// (archive strip), the ten-civilizations grid, the pull quote, the on-chain
// block. To restore one to the homepage, re-add its <section> + matching import.

export default async function Home() {
  // "MEET A CITIZEN" — point cold (non-holder) traffic at the FREE public demo so
  // a stranger can actually TALK to a live citizen in ten seconds, then hit the
  // OWN A FREELON wall. Holder-aware override still happens in the Header.
  const seeAgentHref = "/demo";
  // PERF 2026-06-11: hero backdrop preload moved here from app/layout.tsx —
  // it was shipping 125KB of fetchPriority=high bytes to every route while
  // only this page paints it (.hero--landing::before, globals.css).
  preload("/lore/city.webp", { as: "image", fetchPriority: "high" });
  // The .home-page texture tiles are CSS backgrounds, so the preload scanner
  // can't see them — on /start Lighthouse measured ~1s of LCP load delay from
  // exactly this. Tiny webps now (8KB + 25KB); preload so the textured
  // surface paints with the hero instead of popping in after.
  preload("/textures/archive-grain.webp", { as: "image" });
  preload("/textures/hex-grid.webp", { as: "image" });
  return (
    /* Audit 2026-05-26: .home-page wrapper triggers the scoped
       archival visual system in globals.css. No structure change. */
    <div className="home-page">
      {/* Top-of-funnel pageview beacon (2026-06-16) — the homepage was the single
          highest-traffic, previously-UNMEASURED step. With this +
          meet_citizen_click + demo_view, home_view → meet_citizen_click →
          demo_view → demo_start becomes a readable funnel. */}
      <PageBeacon name="home_view" />
      {/* HERO — current form (since 06-03 funnel restructure): h1 + one literal
          subline + 2 CTAs + the /start text link over the full-bleed city
          backdrop. The 2026-05-28 "4 intent-doors" layout this comment used to
          describe was retired in the 06-03/06-09 passes. */}
      <section className="hero--landing" aria-label="FREELON CITY">
        {/* Full-bleed Mars-city backdrop + dark gradient live in
            .hero--landing (globals.css). The static image now drifts; drop
            a trailer (components/HeroVideo.tsx) to replace it with motion.
            Everything below sits in one centered column over it. */}
        <HeroVideo />
        {/* 2026-06-17 (Algorithm review · "delete pre-pitch theater"): HeroAtmosphere
            (aurora + pointer-glow motion) was removed from the cold path — it ran
            before a stranger knew what the product is, delaying time-to-copy for zero
            understanding. IdentityGreeting + YourAgentsRail (holder-only, rendered
            nothing for ~80% of cold traffic) moved off the homepage to the holder
            surfaces. The hero is now copy-first: anchor → h1 → subline → 2 CTAs. */}
        <div className="hero-landing__inner">
          {/* 2026-06-03 FREELONS-FIRST FUNNEL (founder restructure): the product
              value prop is the FIRST thing, in plain words a newcomer gets in
              ~10 seconds. Lore moved below. Three actions only. The structured
              ecosystem lives in its own section further down, not as competing
              chips up here. */}
          {/* 2026-06-11 AI-CIVILIZATION PIVOT (founder): AI is the forefront.
              The old locked hero ("Where memory becomes character") predated the
              pivot — superseded. Same beloved "Where X becomes Y" shape, new
              thesis; subline = the civilization in plain words + provenance. */}
          {/* 2026-06-29 LAUNCHER PIVOT (founder: "launcher first, lore archive
              second"): the homepage led almost entirely with AI citizens, burying
              Mars + the TCG below the fold. The hero is now the city NAME + a
              one-line "here's what this is", and the three real products are
              co-equal doors immediately below (ProductDoors) — a stranger answers
              "what can I do here?" in three seconds: Enter Mars / Play TCG / Meet
              the citizens. The citizen-only hero anchor + MEET/OWN button row were
              removed (OWN still closes the page at the buy moment). */}
          <h1 className="hero-landing__h1">FREELON CITY</h1>
          <p className="hero-landing__tag">
            A playable AI civilization. <strong>Enter Mars. Play the archive.
            Meet the citizens.</strong>
          </p>
          {/* 2026-06-29 premium launcher rebuild: the hero is now a tight
              cinematic band — name + one product line — and NOTHING else
              competes above the fold. The two lore clocks (CityPulse) and the
              activation-proof strip were pulled OUT of the hero: clocks are
              gone from the cold front door entirely; the proof strip moved
              below the doors (still self-hiding social proof, no longer a
              weak element fighting the three CTAs). The three product doors
              now ARE the above-the-fold CTAs, sitting directly under this. */}
        </div>
      </section>

      {/* ── PRODUCT DOORS — the three front-door actions AND the page's three
          primary CTAs, co-equal and directly under a deliberately short hero
          (2026-06-29 premium launcher rebuild). Enter Mars (/mars-command),
          Play TCG (/crypt-tcg), AI Citizens (/demo). This is the page's primary
          above-the-fold job; everything below (proof, citizen mosaic, how-it-
          works, city week, TCG deep-dive, buy CTA) is now depth, not the front
          door. */}
      <ProductDoors />

      {/* Activation proof — the see→own bridge, relocated out of the hero so it
          supports the doors instead of cluttering the first impression. Real
          paid unlocks as social proof; self-hides until at least one exists. */}
      <div className="home-proofstrip">
        <ActivationProof />
      </div>

      {/* ── THE THREE PRODUCT FEATURE BANDS — one controlled path, each product
          sold at the CryptTcgBand quality bar (2026-06-29 site-design rebuild):
          one product, one strong visual, one message, two CTAs, breathing room.
          Mars → TCG → AI Citizens, in launcher priority order. The weak homepage
          sections that used to sit here (How It Works NFT-instruction, the lore
          term-badge, TransformsWall, CityWeekBand) were demoted off the cold path
          — each still lives at its own route. */}
      <MarsBand />
      <CryptTcgBand />
      <CitizensBand />

      {/* THE ABUNDANCE BAND — real citizens at real size, as collection proof
          directly under the AI-citizens pitch and above the buy beat. */}
      <CitizenMosaic />

      {/* ── CLOSING CTA — one clean ending, agents only. 2026-06-04 newcomer-path
          simplification (founder: "agents are the main thing"): the homepage was
          stripped to the agent story. The ecosystem tree, archive strip, ten
          civilizations, pull quote and on-chain block were removed FROM THE
          HOMEPAGE — every one of those pages still lives at its own route and is
          reachable from the Explore ▾ menu. To restore any to the homepage,
          re-add its section + matching import (history: git + components/_archive). */}
      <section className="home-close reveal">
        <p className="home-close__line">4,040 characters. Make one yours. See what it becomes.</p>
        {/* The close is the BUY moment (after the showcase) — OWN is primary here,
            mirroring the hero where MEET A CITIZEN is primary. Try at the top, buy
            at the bottom. The multi-collection line sits BELOW the buttons
            (2026-06-10): an exploration link must not interrupt the purchase beat. */}
        <div className="home-close__cta">
          <TrackedOpenSeaLink className="btn btn-primary btn-lg" href="https://opensea.io/collection/freelons" from="home_close">
            <span className="ttl">OWN A FREELON <span className="ar">→</span></span>
          </TrackedOpenSeaLink>
          <TrackedLink className="btn btn-secondary btn-lg" href={seeAgentHref} event="meet_citizen_click" from="home_close">
            <span className="ttl">MEET A CITIZEN · FREE →</span>
          </TrackedLink>
        </div>
        {/* 2026-06-11 — civilization frame (lineage verified on Etherscan).
            "FREELONS are the first" was FALSE — The Crypt deployed Oct 2023;
            FREELONS (Apr 2026) are the NEWEST citizens. The city's age is the
            proof, ownership is the hook (Pudgy-possessive, activity-first),
            and the sisters are free-to-meet roles, not copies. No price claims. */}
        <p className="home-close__eco">
          One living city of AI citizens — six collections, founded on-chain in 2023.
          FREELONS are the newest citizens, the ones you can own and train;{" "}
          <strong>Emile, The Crypt, Oogies and Smiles</strong> are free to meet.{" "}
          <Link href="/collections">Explore the collections →</Link>{" · "}
          <Link href="/proof">See why only your FREELON can do this →</Link>
        </p>
        {/* 2026-06-06 buy-handoff polish — OWN A FREELON jumps straight to
            OpenSea, which lands NFT-curious newcomers cold. One line sets the
            expectation (wallet needed, secured on Ethereum) and points the
            unsure to the 2-minute guide instead of bouncing. No price/return
            claims (copy-safety). */}
        <p className="home-close__note">
          Opens OpenSea · secured on Ethereum · a crypto wallet is needed to collect.
          After you collect, come back to <Link href="/my-citizens">awaken it</Link>.{" "}
          <Link href="/help#wallet">New to this? Start here →</Link>
        </p>
        {/* 2026-06-06 — community front door. The site had no path to the
            holders' room from the homepage; owners and the merely-curious both
            land here, so the closing surface is where the invite belongs. */}
        <p className="home-close__community">
          Talk to the city:{" "}
          <a href="https://discord.gg/xcK3E8nCB8" target="_blank" rel="noreferrer">Discord ↗</a>
          {" · "}
          <a href="https://x.com/4040hex" target="_blank" rel="noreferrer">X ↗</a>
        </p>
      </section>
    </div>
  );
}


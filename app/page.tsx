import type { Metadata } from "next";
import Link from "next/link";
import { preload } from "react-dom";
import { HeroVideo } from "@/components/HeroVideo";
import { ActivationProof } from "@/components/ActivationProof";
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
  // 2026-06-30 COLLECTIBLE-FIRST HERO: the hero now leads with one citizen
  // portrait at scale (the thing you own), so its image is the LCP element —
  // preload it high so it paints with the backdrop, not after.
  preload("/heroes/0001.webp", { as: "image", fetchPriority: "high" });
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
        <div className="hero-landing__inner hero-landing__inner--citizen">
          {/* 2026-06-30 COLLECTIBLE-FIRST HERO (acquisition teardown: the four-seat
              panel AND the company review independently flagged the SAME regression —
              the 06-29 launcher hero "A playable AI civilization · Enter Mars / Play
              the archive / Meet the citizens" buried the one thing nobody can clone,
              "it remembers you", under two free games anyone can copy. A stranger
              left not knowing what was OWNABLE). The hero now leads with ONE citizen
              at scale (the thing you own) + the thesis line + the see→own button row.
              The three product doors stay directly below as FEEDERS, not co-equal
              products. Hierarchy is now Citizen (hero) → Mars/TCG (funnel doors). */}
          <span className="hero-eyebrow">FREELON CITY · LIVING AI · ON-CHAIN SINCE 2023</span>
          <div className="hero-portrait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/heroes/0001.webp"
              alt="FREELON citizen #0001 — the Origin Signal"
              width={320}
              height={320}
              loading="eager"
            />
          </div>
          <h1 className="hero-landing__h1 hero-landing__h1--citizen">
            An AI citizen<br />that <strong>remembers you.</strong>
          </h1>
          <p className="hero-landing__tag">
            Own a living AI character — meet one free, watch it recall you, then
            awaken and train it. <strong>Its whole life travels with the NFT.</strong>
          </p>
          <div className="hero-cta-row">
            <TrackedLink
              className="btn btn-primary btn-lg"
              href={seeAgentHref}
              event="meet_citizen_click"
              from="home_hero"
            >
              <span className="ttl">MEET A CITIZEN · FREE <span className="ar">→</span></span>
            </TrackedLink>
            <TrackedOpenSeaLink
              className="btn btn-secondary btn-lg"
              href="https://opensea.io/collection/freelons"
              from="home_hero"
            >
              <span className="ttl">OWN A FREELON →</span>
            </TrackedOpenSeaLink>
          </div>
        </div>
      </section>

      {/* ── PRODUCT DOORS — now FEEDERS under the citizen hero, not co-equal
          products (2026-06-30 collectible-first rebuild). The hero owns the
          ownable thesis ("an AI citizen that remembers you" + see→own CTAs);
          these three doors are the "what else can I do here" funnel: Enter Mars
          (/mars-command), Play TCG (/crypt-tcg), AI Citizens (/demo). Kept as a
          clean co-equal row visually, but they sit BELOW the product pitch now. */}
      <ProductDoors />

      {/* Activation proof — the see→own bridge, relocated out of the hero so it
          supports the doors instead of cluttering the first impression. Real
          paid unlocks as social proof; self-hides until at least one exists. */}
      <div className="home-proofstrip">
        <ActivationProof />
      </div>

      {/* 2026-06-30 REDUCTION PASS (founder + expert panel: teardown / art-director /
          product-lead all converged): the three full-width product feature bands
          (MarsBand / CryptTcgBand / CitizensBand) were DELETED from the homepage —
          they re-sold the exact same three products the ProductDoors above already
          name and link, at three full screens of near-identical gold-washed boxes.
          That double-pitch was the "scroll loads and it's still the same stuff"
          bloat. The bands' component files remain on disk for reuse on each
          product's own route (/mars-command, /crypt-tcg, /demo). Front door is now
          one beat per idea: Hero → Doors → Proof → Mosaic → Close. */}

      {/* THE ABUNDANCE BAND — real citizens at real size, as collection proof
          above the buy beat. The one piece of unfakeable spectacle (4,040 renders). */}
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
        {/* WORLD BRIDGE (2026-06-30): the 06-30 reduction collapsed the close to
            buy + wallet note, which dropped the ONE beat that tells a stranger
            this is a world, not a single drop — they left not knowing six
            collections exist or why FREELON is the one being pushed. This is the
            single ecosystem line the locked ecosystem map (§5) says belongs on the
            homepage: not the grid/tree the reduction rightly cut (that was a
            second sitemap), just the "the city is bigger" bridge to /collections.
            Reuses the purpose-built .home-close__eco hook orphaned by the
            reduction. Sits BELOW the buy CTA so it never interrupts the purchase
            beat (the 06-10 rule). Copy stays descriptive — no value/return or
            on-chain-durability claims (COPY_LEGAL_CHECKLIST). */}
        <p className="home-close__eco">
          <strong>FREELON</strong> is the flagship citizen you own and train — but it lives in a
          whole city: <strong>six collections</strong>, one signal. The wild, the dead, the
          emotional, the lost, and the ones you keep. <Link href="/collections">See all six →</Link>
        </p>
        <p className="home-close__note">
          Opens OpenSea · secured on Ethereum · a crypto wallet is needed to collect.
          After you collect, come back to <Link href="/my-citizens">awaken it</Link>.{" "}
          <Link href="/help#wallet">New to this? Start here →</Link>
        </p>
      </section>
    </div>
  );
}


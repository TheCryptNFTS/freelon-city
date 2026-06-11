import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { preload } from "react-dom";
import reveals from "@/components/HomeReveals.module.css";
import { IdentityGreeting } from "@/components/IdentityGreeting";
import { HeroVideo } from "@/components/HeroVideo";
import { HeroAtmosphere } from "@/components/HeroAtmosphere";
import TransformsWall from "@/components/TransformsWall";
import { ActivationProof } from "@/components/ActivationProof";
import { YourAgentsRail } from "@/components/YourAgentsRail";
import { MemoryProof } from "@/components/MemoryProof";
import { CityWeekBand } from "@/components/CityWeekBand";
import { CityPulse } from "@/components/CityPulse";
import { TrackedOpenSeaLink } from "@/components/TrackedOpenSeaLink";

// Phase 1 metadata 2026-05-26 — route-specific text. Homepage uses
// `title.absolute` to bypass the layout template (otherwise the
// title would become "404 — FREELON CITY · Bring identity back. ·
// FREELON CITY" with the suffix duplicated).
// Product-first (P1, 2026-06-09): this is the most-shared/indexed text (meta +
// OG + Twitter), so it must deliver the pitch, not lore. Matches the canonical
// 10-second line + the on-page hero subline. Lore lives on the page, not here.
const HOME_DESC =
  "4,040 AI characters you own and train. Yours builds a visible work history that travels with the NFT — through every sale. Try one free.";
export const metadata: Metadata = {
  title: { absolute: "404 — FREELON CITY · Bring identity back." },
  description: HOME_DESC,
  openGraph: {
    // 2026-06-10 — /api/og/universe with NO query serves the branded FreelonCard
    // (portrait + "AN AI CHARACTER YOU OWN" + pitch). The six-collections scope
    // card still exists behind ?v=universe but nothing links it — the product
    // card wins for cold traffic, deliberately.
    // T3 2026-06-11 — share title sells the product; og:title "404 — FREELON
    // CITY" previewed as a broken page on X. The 404 motif stays on-page and
    // inside the OG image renderer, never in the share-card title tags.
    title: "FREELON CITY — own and train an AI citizen",
    description: HOME_DESC,
    images: [{ url: "/api/og/universe?b=2", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FREELON CITY — own and train an AI citizen",
    description: HOME_DESC,
    images: ["/api/og/universe?b=2"],
  },
};

// 2026-05-28: the landing was rebuilt to 4 static intent-doors over a
// full-bleed city backdrop — the cookie-aware CTA swap (and its
// cookies() call) is gone. Kept force-dynamic so the wallet-aware
// client islands (IdentityGreeting / HeroMarketStat) never get baked
// into a stale static shell.
export const dynamic = "force-dynamic";
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
        {/* Motion-tier upgrade (2026-06-06): aurora field + pointer-reactive
            signal glow over the dark city. Asset-free, reduced-motion safe. */}
        <HeroAtmosphere />
        <div className="hero-landing__inner">
          {/* Live identity greeting — wallet-aware. For known viewers
              the page transforms into a personal experience (civ color,
              handle, citizen count, hex balance). */}
          <IdentityGreeting />

          {/* Connected-holder home — a real "YOUR AGENTS" rail (their own citizen
              art, framed, linking into each agent) instead of the old tiny strip.
              Renders nothing for non-holders, so the newcomer pitch below leads. */}
          <YourAgentsRail />

          {/* 2026-06-03 FREELONS-FIRST FUNNEL (founder restructure): the product
              value prop is the FIRST thing, in plain words a newcomer gets in
              ~10 seconds. Lore moved below. Three actions only. The structured
              ecosystem lives in its own section further down, not as competing
              chips up here. */}
          <h1 className="hero-landing__h1">
            Where memory becomes <strong>character</strong>.
          </h1>
          <p className="hero-landing__tag">
            4,040 citizens of FREELON CITY — AI characters you own and train. The work
            yours does becomes a visible history that travels with the NFT.
          </p>
          {/* ONE primary (MEET A CITIZEN — experience it first), OWN secondary.
              EARN HEX lives in the header; the closing CTA repeats OWN at the buy
              moment. Deduped 2026-06-06 (each action appears once per surface).
              "Citizen", never "agent", on cold surfaces — AWAKEN canon; the label
              also matches the /demo headline so the scent trail holds. */}
          <div className="hero-landing__cta hero-cta-row">
            <Link className="btn btn-primary btn-lg" href={seeAgentHref}>
              <span className="ttl">MEET A CITIZEN · FREE →</span>
            </Link>
            {/* T11 2026-06-11 — opensea_click {from} funnel event on the buy CTA. */}
            <TrackedOpenSeaLink className="btn btn-secondary btn-lg" href="https://opensea.io/collection/freelons" from="home_hero">
              <span className="ttl">OWN A FREELON <span className="ar">→</span></span>
            </TrackedOpenSeaLink>
          </div>
          <Link className="hero-landing__newhere" href="/start">New here? The 2-minute guide →</Link>

          {/* CITY PULSE (2026-06-11) — two honest clocks under the CTAs: Day N
              since The Crypt's Oct-2023 creation tx (the city's Etherscan-
              verifiable founding) + countdown to the real Sunday 18:00 UTC
              Signal Report cron. Client-only, self-hiding; both numbers track
              real events (see components/CityPulse.tsx). */}
          <div style={{ marginTop: "var(--s-3)" }}>
            <CityPulse />
          </div>

          {/* Activation proof — the see→own bridge. Real paid unlocks as social
              proof; self-hides until at least one exists. 2026-06-07. */}
          <div style={{ marginTop: "var(--s-3)" }}>
            <ActivationProof />
          </div>

          {/* SURFACE-REDUCTION 2026-06-09: removed HeroMarketStat (floor/supply
              pill) from above the fold — market data is not the front door. The
              floor still lives on /dashboard. Lore badge sits below How-It-Works. */}
        </div>
      </section>

      {/* ── MEMORY PROOF — the "understanding by demonstration" beat (2026-06-09).
          A cold visitor doesn't grasp "a character that remembers you" from copy;
          they grasp it by watching it happen with their OWN words. Deterministic +
          zero-cost (no LLM, no free-run budget, no abuse surface — see
          components/MemoryProof.tsx), it stages the remember-loop, then hands off to
          the live agent at /demo. This is the proof; How It Works below is the how. */}
      {/* Punch-list HIGH-IMPACT (2026-06-11): section rides the global .reveal
          IO at 0.6s expo (reveals.rv) and its beats stagger in 70ms apart
          (reveals.stagger — kicker → h2 → the proof shell). Real <h2> under
          the kicker per the eyebrow+heading hierarchy spec. */}
      <section className={`memory-proof reveal ${reveals.rv} ${reveals.stagger}`} aria-label="See a citizen remember you">
        <span className="kicker memory-proof__kicker" style={{ color: "var(--gold)" }}>⬡ SEE IT REMEMBER YOU</span>
        <h2 className={`${reveals.sectionH2} ${reveals.sectionH2Center}`}>
          Tell it one thing. <em>Watch it stick.</em>
        </h2>
        <MemoryProof />
      </section>

      {/* "Why own a FREELON?" section removed 2026-06-07 (founder: "too complex")
          — it restated the hero tag AND "How it works" below as a third copy of
          the same value prop. The hero says it once; How It Works shows the loop. */}

      {/* ── HOW IT WORKS — the loop in four steps + the six roles a FREELON can
          grow into. Compressed 6→4 (2026-06-08) to cut newcomer cognitive load:
          the train/earn/history beats are one step now, so the loop reads in one
          glance instead of six near-identical lines. */}
      <section className={`how-it-works reveal ${reveals.rv}`}>
        <span className="kicker">⬡ HOW IT WORKS</span>
        {/* Punch-list HIGH-IMPACT (2026-06-11): real <h2> under the kicker;
            the four steps child-stagger 70ms apart off the section's reveal. */}
        <h2 className={reveals.sectionH2}>
          One character. <em>Four steps.</em>
        </h2>
        <ol className={`how-steps ${reveals.stagger}`}>
          {[
            "Own a FREELON — it's your character",
            "Awaken it — a one-time ETH payment switches it on, and it stays awake through resale",
            "Train it — give it jobs; it earns XP, remembers you, and builds a public record",
            "Keep it or sell it — the character and its whole history travel with the NFT",
          ].map((s, i) => (
            <li key={i} style={{ "--i": i } as CSSProperties}><span className="how-n">{String(i + 1).padStart(2, "0")}</span>{s}</li>
          ))}
        </ol>
        {/* V1 SIGNAL OS (2026-06-10): one live-status line. Holders told us they
            can't tell what's live vs roadmap — this is the cheapest trust win.
            Factual: all four steps run on the site today. No promises made. */}
        <p style={{ marginTop: "var(--s-3)", fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.08em", color: "var(--ink-dim)", textAlign: "center" }}>
          <span style={{ color: "var(--gold)" }}>●</span> All four steps are live on the site today — this is not a roadmap.
        </p>
        {/* SURFACE-REDUCTION 2026-06-09: removed the "ROLES IT CAN GROW INTO"
            list (Writer/Strategist/Sales Agent/Researcher/Designer/Red Team) —
            it read like generic ChatGPT-with-NFTs and weakened the pitch. */}
      </section>

      {/* Lore flavour — relocated here 2026-06-08 from the hero. Lore is a
          depth reward, not a first-impression element; it sits AFTER the loop
          is understood. Same markup, just moved. */}
      <span className="term-badge term-badge--static" style={{ display: "block", textAlign: "center", margin: "var(--s-5) auto" }}><span className="dot" />THE HEX VANISHED · CYCLE 0404</span>

      {/* SURFACE-REDUCTION 2026-06-09: collapsed two stacked citizen bands
          (CitizenShowcase + TransformsWall) into ONE preview. Kept TransformsWall
          — "see what citizens actually MAKE" is the stronger proof for the
          create-loop story and self-hides when empty. The portrait showcase
          lives on /citizens (the chooser). */}
      <TransformsWall />

      {/* ── THIS WEEK IN THE CITY — the public-life proof beat (2026-06-10).
          Wires the Signal Report keystone into the front door: winner civ + the
          most storied citizens, directly above the buy moment. Reuses /report's
          hardened read-only queries; self-hides while the stadium is empty. */}
      <CityWeekBand />

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
          <Link className="btn btn-secondary btn-lg" href={seeAgentHref}>
            <span className="ttl">MEET A CITIZEN · FREE →</span>
          </Link>
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
          <Link href="/collections">Explore the collections →</Link>
        </p>
        {/* 2026-06-06 buy-handoff polish — OWN A FREELON jumps straight to
            OpenSea, which lands NFT-curious newcomers cold. One line sets the
            expectation (wallet needed, secured on Ethereum) and points the
            unsure to the 2-minute guide instead of bouncing. No price/return
            claims (copy-safety). */}
        <p className="home-close__note">
          Opens OpenSea · secured on Ethereum · a crypto wallet is needed to collect.{" "}
          <Link href="/start">New to this? Start here →</Link>
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


import type { Metadata } from "next";
import Link from "next/link";
import { IdentityGreeting } from "@/components/IdentityGreeting";
import { HeroVideo } from "@/components/HeroVideo";
import { HeroAtmosphere } from "@/components/HeroAtmosphere";
import TransformsWall from "@/components/TransformsWall";
import { ActivationProof } from "@/components/ActivationProof";
import { YourAgentsRail } from "@/components/YourAgentsRail";

// Phase 1 metadata 2026-05-26 — route-specific text. Homepage uses
// `title.absolute` to bypass the layout template (otherwise the
// title would become "404 — FREELON CITY · Bring identity back. ·
// FREELON CITY" with the suffix duplicated).
// Product-first (P1, 2026-06-09): this is the most-shared/indexed text (meta +
// OG + Twitter), so it must deliver the pitch, not lore. Matches the canonical
// 10-second line + the on-page hero subline. Lore lives on the page, not here.
const HOME_DESC =
  "4,040 AI characters you own and train. Each FREELON is an agent that remembers your work — and its whole history travels with the NFT. Try one free.";
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
// 2026-06-04 — AGENTS-ONLY homepage (founder: "agents are the main thing").
// The newcomer-path simplification stripped everything that wasn't the agent
// pitch. Current spine: Hero → Why own → How it works → CitizenShowcase →
// closing CTA. Removed from the homepage (each still lives at its own route,
// reachable via the Explore ▾ menu): the ecosystem tree, OtherSignalsStrip
// (archive strip), the ten-civilizations grid, the pull quote, the on-chain
// block. To restore one to the homepage, re-add its <section> + matching import.

export default async function Home() {
  // "SEE AN AGENT" — point cold (non-holder) traffic at the FREE public demo so
  // a stranger can actually TALK to a live agent in ten seconds, then hit the
  // OWN A FREELON wall. Holder-aware override still happens in the Header.
  const seeAgentHref = "/demo";
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
            4,040 AI characters you own and train — yours remembers everything you build
            together, and the whole history travels with the NFT.
          </p>
          {/* ONE primary (SEE AN AGENT — experience it first), OWN secondary.
              EARN HEX lives in the header; the closing CTA repeats OWN at the buy
              moment. Deduped 2026-06-06 (each action appears once per surface). */}
          <div className="hero-landing__cta hero-cta-row">
            <Link className="btn btn-primary btn-lg" href={seeAgentHref}>
              <span className="ttl">SEE AN AGENT →</span>
            </Link>
            <a className="btn btn-secondary btn-lg" href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer">
              <span className="ttl">OWN A FREELON <span className="ar">→</span></span>
            </a>
          </div>
          <Link className="hero-landing__newhere" href="/start">New here? The 2-minute guide →</Link>

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

      {/* "Why own a FREELON?" section removed 2026-06-07 (founder: "too complex")
          — it restated the hero tag AND "How it works" below as a third copy of
          the same value prop. The hero says it once; How It Works shows the loop. */}

      {/* ── HOW IT WORKS — the loop in four steps + the six roles a FREELON can
          grow into. Compressed 6→4 (2026-06-08) to cut newcomer cognitive load:
          the train/earn/history beats are one step now, so the loop reads in one
          glance instead of six near-identical lines. */}
      <section className="how-it-works reveal">
        <span className="kicker">⬡ HOW IT WORKS</span>
        <ol className="how-steps">
          {[
            "Own a FREELON — it's your character",
            "Unlock its agent with a one-time ETH payment",
            "Train it — give it jobs; it earns XP, remembers you, and builds a history",
            "Keep it or sell it — the character and its whole history travel with the NFT",
          ].map((s, i) => (
            <li key={i}><span className="how-n">{String(i + 1).padStart(2, "0")}</span>{s}</li>
          ))}
        </ol>
        {/* SURFACE-REDUCTION 2026-06-09: removed the "ROLES IT CAN GROW INTO"
            list (Writer/Strategist/Sales Agent/Researcher/Designer/Red Team) —
            it read like generic ChatGPT-with-NFTs and weakened the pitch. */}
      </section>

      {/* Lore flavour — relocated here 2026-06-08 from the hero. Lore is a
          depth reward, not a first-impression element; it sits AFTER the loop
          is understood. Same markup, just moved. */}
      <span className="term-badge flicker" style={{ display: "block", textAlign: "center", margin: "var(--s-5) auto" }}><span className="dot" />THE HEX VANISHED · CYCLE 0404</span>

      {/* SURFACE-REDUCTION 2026-06-09: collapsed two stacked citizen bands
          (CitizenShowcase + TransformsWall) into ONE preview. Kept TransformsWall
          — "see what citizens actually MAKE" is the stronger proof for the
          create-loop story and self-hides when empty. The portrait showcase
          lives on /citizens (the chooser). */}
      <TransformsWall />

      {/* ── CLOSING CTA — one clean ending, agents only. 2026-06-04 newcomer-path
          simplification (founder: "agents are the main thing"): the homepage was
          stripped to the agent story. The ecosystem tree, archive strip, ten
          civilizations, pull quote and on-chain block were removed FROM THE
          HOMEPAGE — every one of those pages still lives at its own route and is
          reachable from the Explore ▾ menu. To restore any to the homepage,
          re-add its section + matching import (history: git + components/_archive). */}
      <section className="home-close reveal">
        <p className="home-close__line">4,040 characters. Make one yours. See what it becomes.</p>
        {/* 2026-06-08 — multi-collection agent line. FREELONS stays the flagship;
            this one sentence tells the visitor the OTHER collections are becoming
            agents too, and points to /collections (the full story). No price claims. */}
        <p className="home-close__note">
          FREELONS are the first. Emile, The Crypt and Oogies are agents too — one signal, many collections.{" "}
          <Link href="/collections">Explore the collections →</Link>
        </p>
        {/* The close is the BUY moment (after the showcase) — OWN is primary here,
            mirroring the hero where SEE AN AGENT is primary. Try at the top, buy
            at the bottom. */}
        <div className="home-close__cta">
          <a className="btn btn-primary btn-lg" href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer">
            <span className="ttl">OWN A FREELON <span className="ar">→</span></span>
          </a>
          <Link className="btn btn-secondary btn-lg" href={seeAgentHref}>
            <span className="ttl">SEE AN AGENT →</span>
          </Link>
        </div>
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
          <a href="https://x.com/freeloncity" target="_blank" rel="noreferrer">X ↗</a>
        </p>
      </section>
    </div>
  );
}


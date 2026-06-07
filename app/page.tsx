import type { Metadata } from "next";
import Link from "next/link";
import { IdentityGreeting } from "@/components/IdentityGreeting";
import { HeroVideo } from "@/components/HeroVideo";
import { HeroAtmosphere } from "@/components/HeroAtmosphere";
import { CitizenShowcase } from "@/components/CitizenShowcase";
import { HeroMarketStat } from "@/components/HeroMarketStat";
import TransformsWall from "@/components/TransformsWall";
import { ActivationProof } from "@/components/ActivationProof";

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
// 2026-06-04 — AGENTS-ONLY homepage (founder: "agents are the main thing").
// The newcomer-path simplification stripped everything that wasn't the agent
// pitch. Current spine: Hero → Why own → How it works → CitizenShowcase →
// closing CTA. Removed from the homepage (each still lives at its own route,
// reachable via the Explore ▾ menu): the ecosystem tree, OtherSignalsStrip
// (archive strip), the ten-civilizations grid, the pull quote, the on-chain
// block. To restore one to the homepage, re-add its <section> + matching import.

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
        {/* Motion-tier upgrade (2026-06-06): aurora field + pointer-reactive
            signal glow over the dark city. Asset-free, reduced-motion safe. */}
        <HeroAtmosphere />
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
            FREELONS are 4,040 <strong>AI characters you own</strong>.
          </h1>
          <p className="hero-landing__tag">
            It&apos;s yours — turn it into anything, give it real jobs, and it remembers everything you build
            together. The character, the training, and the whole history travel with the NFT.
          </p>
          {/* ONE primary (SEE AN AGENT — experience it first), OWN secondary.
              EARN HEX lives in the header; the closing CTA repeats OWN at the buy
              moment. Deduped 2026-06-06 (each action appears once per surface). */}
          <div className="hero-landing__cta hero-cta-row">
            <Link className="btn btn-primary btn-lg" href="/citizens/1">
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

          {/* Lore flavour, now SECONDARY (below the value prop + actions). */}
          <span className="term-badge flicker" style={{ marginTop: "var(--s-5)" }}><span className="dot" />THE HEX VANISHED · CYCLE 0404</span>

          {/* 2026-05-28 collector pass — live floor + sealed-supply line.
              Client-side fetch, never blocks the hero LCP. */}
          <HeroMarketStat />
        </div>
      </section>

      {/* "Why own a FREELON?" section removed 2026-06-07 (founder: "too complex")
          — it restated the hero tag AND "How it works" below as a third copy of
          the same value prop. The hero says it once; How It Works shows the loop. */}

      {/* ── HOW IT WORKS — the loop in six steps + the six roles a FREELON can
          grow into. */}
      <section className="how-it-works reveal">
        <span className="kicker">⬡ HOW IT WORKS</span>
        <ol className="how-steps">
          {[
            "Own a FREELON — it's your character",
            "Unlock its agent with a one-time ETH payment",
            "Transform it, and give it real jobs",
            "It earns XP and remembers you",
            "Its work history grows",
            "Keep it — or sell it later as a trained character",
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
      </section>

      {/* CITIZEN SHOWCASE — the homepage finally shows the product. A
          4040-PFP project that displayed zero Freelons couldn't "show, not
          tell"; this slow band of real portraits (1/1s + honoraries) fixes
          that the moment a visitor scrolls past the hero. */}
      <CitizenShowcase />

      {/* PROOF WITHOUT A PAYWALL — a live wall of real transforms owners made.
          Self-hides until the feed has entries, so it never shows empty. */}
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
        {/* The close is the BUY moment (after the showcase) — OWN is primary here,
            mirroring the hero where SEE AN AGENT is primary. Try at the top, buy
            at the bottom. */}
        <div className="home-close__cta">
          <a className="btn btn-primary btn-lg" href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer">
            <span className="ttl">OWN A FREELON <span className="ar">→</span></span>
          </a>
          <Link className="btn btn-secondary btn-lg" href="/citizens/1">
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


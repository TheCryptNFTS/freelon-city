"use client";

import dynamic from "next/dynamic";

/**
 * GlobalListeners (#42, 2026-06-27) — site-wide decorative / easter-egg islands
 * that must exist on every route but render NOTHING until a client interaction:
 *
 *  - Spotlight     — cursor-glow CSS vars (pointer-fine only; static fallback)
 *  - EasterEggCode — listens for the "0404" key sequence
 *  - Ghost404      — surfaces only in the 04:04–04:05 UTC window
 *
 * They were imported directly into the root layout, so their JS shipped in the
 * shared bundle and hydrated on all ~54 routes despite producing no SSR markup.
 * Loading them here via next/dynamic with ssr:false (allowed because THIS is a
 * client component) keeps them global while pulling them out of the server
 * render and the critical hydration path — they stream in as their own lazy
 * chunk after the page is interactive. Zero visual change (all three render null
 * at rest).
 */
const Spotlight = dynamic(() => import("@/components/Spotlight").then((m) => m.Spotlight), { ssr: false });
const EasterEggCode = dynamic(() => import("@/components/EasterEggCode").then((m) => m.EasterEggCode), { ssr: false });
const Ghost404 = dynamic(() => import("@/components/Ghost404").then((m) => m.Ghost404), { ssr: false });

export function GlobalListeners() {
  return (
    <>
      <Spotlight />
      <EasterEggCode />
      <Ghost404 />
    </>
  );
}

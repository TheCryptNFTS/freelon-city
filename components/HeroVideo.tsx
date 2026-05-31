"use client";
import { useEffect, useState } from "react";

// ── HERO VIDEO ──────────────────────────────────────────────────────
// Show-don't-tell: top game sites (LoL, Hearthstone, Genshin) lead with a
// looping trailer behind the headline. Drop a muted, looping clip in
// /public/atmos/ and set HERO_VIDEO_SRC below to switch the homepage hero
// from the static city image to motion.
//
// Until a file is provided this renders NOTHING and the CSS background
// (.hero--landing::before → /lore/city.webp, which now also drifts) shows
// through. No console 404, no layout shift, no LCP hit.
//
// ── ASSET SPEC (what to provide) ───────────────────────────────────
//   • Path:   put the file at /public/atmos/hero.mp4 (+ optional .webm),
//             then set HERO_VIDEO_SRC = "/atmos/hero.mp4".
//   • Length: 12–25s, seamless loop (last frame ≈ first frame).
//   • Audio:  none — autoplay requires muted, and the track wastes bytes.
//   • Spec:   1920×1080 (16:9), H.264 MP4 ~4–8 Mbps (+ VP9 .webm for size).
//   • Look:   dark / low-contrast and slow-moving so the white headline
//             stays legible on top. Poster frame = the current city image.
//   • Weight: aim < 6 MB so it never blocks first paint on mobile.
//
// Honours prefers-reduced-motion: users who ask for less motion keep the
// static image instead of the video.
export const HERO_VIDEO_SRC: string | null = null; // ← set to "/atmos/hero.mp4" when ready
export const HERO_VIDEO_WEBM: string | null = null; // ← optional "/atmos/hero.webm"

export function HeroVideo() {
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  if (!HERO_VIDEO_SRC || failed || reducedMotion) return null;

  return (
    <video
      className="hero-video"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster="/lore/city.webp"
      aria-hidden
      onError={() => setFailed(true)}
    >
      {HERO_VIDEO_WEBM && <source src={HERO_VIDEO_WEBM} type="video/webm" />}
      <source src={HERO_VIDEO_SRC} type="video/mp4" />
    </video>
  );
}

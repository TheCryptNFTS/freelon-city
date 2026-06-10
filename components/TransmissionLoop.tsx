"use client";

/**
 * RECOVERED TRANSMISSION — ambient battle-record loop (Grok Imagine img2vid,
 * 2026-06-11, generated FROM the citizen's transmission still so the character
 * is frame-for-frame faithful).
 *
 * Autoplays muted (with the React muted-attribute fix — React omits the
 * attribute, which makes browsers block autoplay), loops, and the still it was
 * generated from is the poster — so a refused/slow load shows the exact same
 * art, never a black box.
 */
export function TransmissionLoop({ src, poster, alt }: { src: string; poster: string; alt: string }) {
  return (
    <video
      className="transmission-cut__img"
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={alt}
      ref={(el) => {
        if (el && !el.hasAttribute("muted")) {
          el.setAttribute("muted", "");
          el.muted = true;
          el.play().catch(() => {/* poster still remains — same art */});
        }
      }}
    />
  );
}

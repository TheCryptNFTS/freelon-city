"use client";
import { useEffect } from "react";

// Linear-style mouse-tracking spotlight. Tracks the cursor and exposes
// --mx / --my CSS vars on <body> so any surface can use them.
export function Spotlight() {
  useEffect(() => {
    // 2026-06-17 (Algorithm review): the cursor-glow is pure decoration and only
    // matters on a pointer-fine device. Skip the global mousemove listener entirely on
    // touch (most traffic — it never fires there anyway) and when reduced motion is
    // requested. Every CSS consumer of --mx/--my has a static fallback, so the glow
    // simply rests upper-centre instead of trailing the cursor — nothing breaks.
    if (typeof window === "undefined" || !window.matchMedia) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        document.body.style.setProperty("--mx", `${e.clientX}px`);
        document.body.style.setProperty("--my", `${e.clientY}px`);
        raf = 0;
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}

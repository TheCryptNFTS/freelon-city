"use client";
import { useEffect, useRef } from "react";

// ── HERO ATMOSPHERE ─────────────────────────────────────────────────
// The motion-tier upgrade (2026-06-06). Top sites — Linear, Stripe, Vercel —
// signal craft with a slow "aurora" field plus one pointer-reactive light.
// This is that, in the FREELON palette, asset-free and GPU-cheap:
//
//   • AURORA — three slow-drifting colour blobs (gold / signal-violet /
//     signal-cyan) over the dark city, blended with `screen` so they read
//     as light leaking through, never as flat shapes. Autonomous: it breathes
//     on its own, so the hero is alive even before the visitor touches it.
//   • SIGNAL GLOW — a soft spotlight that follows the pointer (the "signal"
//     the city is trying to restore). Updated via CSS custom props on a rAF
//     so pointermove never thrashes layout. Falls back to a centered glow on
//     touch / no-pointer devices.
//
// Honours prefers-reduced-motion: the drift + pointer follow are dropped and
// a single static glow remains, so the look survives without the motion.
export function HeroAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Pointer-follow only where there's a real pointer (skip touch).
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let raf = 0;
    let nx = 50;
    let ny = 38; // resting position matches the CSS default
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      nx = ((e.clientX - r.left) / r.width) * 100;
      ny = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          el.style.setProperty("--mx", `${nx.toFixed(2)}%`);
          el.style.setProperty("--my", `${ny.toFixed(2)}%`);
        });
      }
    };
    el.classList.add("is-live");
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="hero-atmos" ref={ref} aria-hidden>
      <span className="hero-atmos__aurora" />
      <span className="hero-atmos__glow" />
    </div>
  );
}

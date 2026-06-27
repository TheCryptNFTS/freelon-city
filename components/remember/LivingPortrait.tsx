"use client";

import { useEffect, useRef, useState } from "react";

/**
 * LivingPortrait — the citizen, alive.
 *
 * The collection art is a faceted monolith head with a single bright hex eye.
 * This component makes that face *react*: the eye tracks the visitor's cursor,
 * the figure breathes, the eye brightens while you talk to it ("listening") and
 * flares when it takes something in ("knowing"). Cut its memory and the light
 * goes out of the eye, the breath stops, and the whole figure desaturates — the
 * picture of a mind switched off. That death is the share-able beat: a generated
 * "memory" can fade text, but it cannot make a face go dark.
 *
 * No new art — pure CSS/RAF over the existing hero webp. Cursor tracking is fed
 * through CSS custom properties (--px/--py in −1..1) set on a ref, so the gaze
 * follows without a React re-render per mouse move.
 */

export function LivingPortrait({
  src,
  alive,
  listening = false,
  fading = false,
  flareSignal = 0,
  showEye = true,
  frame = true,
  fill = false,
  eyeX = 50.3,
  eyeY = 28,
  eyeColor = "#5AB6F0",
  eyeCore = "#CDEBFF",
  size = 460,
  alt = "FREELON citizen",
}: {
  src: string;
  alive: boolean;
  /** Brighten + tighten the eye while the visitor is speaking to it. */
  listening?: boolean;
  /** Half-life: breath slows + light dims, the moment before it dies (neglect). */
  fading?: boolean;
  /** Bump this to fire a single "it took that in" flare (e.g. on each answer). */
  flareSignal?: number;
  /**
   * Render the art-specific hex eye. Off by default-safe for arbitrary citizen
   * art where the eye location is unknown — breath / awaken / death still read
   * without it, so the life layer is correct collection-wide.
   */
  showEye?: boolean;
  /** Draw the component's own border / rounded background. Off = sit inside an
   *  existing frame (e.g. the citizen-page .img-shell) without doubling chrome. */
  frame?: boolean;
  /** Fill the parent (width/height 100%) instead of a square maxWidth box. */
  fill?: boolean;
  /** Eye location as a % of the frame (the bright hex gem in the art). */
  eyeX?: number;
  eyeY?: number;
  eyeColor?: string;
  eyeCore?: string;
  size?: number;
  alt?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [flaring, setFlaring] = useState(false);

  // Pointer → CSS vars, no re-render. The eye leans further than the head, so
  // the gaze reads as the eye looking AT the cursor, not the whole image sliding.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      const py = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--px", px.toFixed(3));
        el.style.setProperty("--py", py.toFixed(3));
      });
    };
    const onLeave = () => {
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // A flare when the signal changes (it just took a fact in).
  useEffect(() => {
    if (!flareSignal || !alive) return;
    setFlaring(true);
    const t = setTimeout(() => setFlaring(false), 620);
    return () => clearTimeout(t);
  }, [flareSignal, alive]);

  const cls = [
    "lp-stage",
    alive ? "lp-alive" : "lp-dead",
    fading && alive ? "lp-fading" : "",
    listening && alive ? "lp-listening" : "",
    flaring ? "lp-flaring" : "",
    frame ? "" : "lp-bare",
  ]
    .filter(Boolean)
    .join(" ");

  const stageStyle: React.CSSProperties = fill
    ? { width: "100%", height: "100%" }
    : { width: "100%", maxWidth: size, aspectRatio: "1 / 1" };

  const eyePos = { left: `${eyeX}%`, top: `${eyeY}%` };

  return (
    <div
      ref={stageRef}
      className={cls}
      style={stageStyle}
      role="img"
      aria-label={alt}
    >
      <style>{LP_CSS}</style>

      <div className="lp-breath">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lp-img" src={src} alt={alt} draggable={false} />

        {/* a faint halo breath behind the figure */}
        <div className="lp-halo" />

        {/* the eye — leans toward the cursor, pulses, flares, dies. Only drawn
            when the caller knows where the eye sits in this particular art. */}
        {showEye && (
          <div className="lp-eyewrap" style={eyePos}>
            <div
              className="lp-eye"
              style={{
                background: `radial-gradient(circle, ${eyeCore} 0%, ${eyeColor} 32%, color-mix(in srgb, ${eyeColor} 40%, transparent) 55%, transparent 72%)`,
              }}
            />
            <div
              className="lp-flare"
              style={{
                background: `radial-gradient(circle, #ffffff 0%, ${eyeCore} 30%, ${eyeColor} 50%, transparent 70%)`,
              }}
            />
          </div>
        )}

        {/* slow-rising motes — subliminal "this air is alive" */}
        <div className="lp-mote lp-mote1" />
        <div className="lp-mote lp-mote2" />

        {/* when it dies, a cold wash settles over the frame */}
        <div className="lp-deathwash" />
      </div>
    </div>
  );
}

const LP_CSS = `
.lp-stage {
  --px: 0; --py: 0;
  position: relative;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--line, rgba(245,242,232,0.12));
  background: #07060a;
  isolation: isolate;
  touch-action: pan-y;
}
/* Sit inside a host frame (the citizen-page shell) with no chrome of its own. */
.lp-bare {
  border: none;
  background: transparent;
  border-radius: 0;
  margin: 0;
}
.lp-breath {
  position: absolute;
  inset: 0;
  transform-origin: 50% 42%;
  animation: lp-breath 5.2s ease-in-out infinite;
  will-change: transform;
}
.lp-dead .lp-breath { animation-play-state: paused; }
/* HALF-LIFE — neglected: the breath drags and the color starts to drain, the
   visible warning beat the moment before the light goes out. */
.lp-fading .lp-breath { animation-duration: 9s; }
.lp-fading .lp-img { filter: saturate(0.66) brightness(0.82); }
.lp-fading .lp-eye { filter: brightness(0.66); animation-duration: 5s; }
.lp-fading .lp-halo { opacity: 0.4; }

.lp-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 18%;
  transform: translate(calc(var(--px) * 5px), calc(var(--py) * 5px)) scale(1.06);
  transition: transform 0.22s ease-out, filter 0.85s ease;
  filter: saturate(1.04) brightness(1.02);
}
.lp-dead .lp-img { filter: saturate(0.12) brightness(0.46) contrast(0.95); }

.lp-halo {
  position: absolute;
  left: 50%; top: 34%;
  width: 78%; height: 78%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(233,201,132,0.16) 0%, rgba(233,201,132,0.05) 38%, transparent 62%);
  mix-blend-mode: screen;
  animation: lp-halo 6.4s ease-in-out infinite;
  pointer-events: none;
}
.lp-dead .lp-halo { opacity: 0; transition: opacity 0.85s ease; }

.lp-eyewrap {
  position: absolute;
  width: 0; height: 0;
  transform: translate(calc(var(--px) * 12px), calc(var(--py) * 12px));
  transition: transform 0.16s ease-out;
  pointer-events: none;
}
.lp-eye, .lp-flare {
  position: absolute;
  left: 50%; top: 50%;
  width: 190px; height: 190px;
  margin: -95px 0 0 -95px;
  border-radius: 50%;
  mix-blend-mode: screen;
}
.lp-eye {
  animation: lp-eye 3.1s ease-in-out infinite;
  transition: opacity 0.8s ease;
}
.lp-listening .lp-eye { animation-duration: 1.9s; filter: brightness(1.3); }
.lp-dead .lp-eye { opacity: 0 !important; animation-play-state: paused; }

.lp-flare { opacity: 0; transform: scale(0.7); }
.lp-flaring .lp-flare { animation: lp-flare 0.62s ease-out; }

.lp-mote {
  position: absolute;
  width: 3px; height: 3px;
  border-radius: 50%;
  background: rgba(233,201,132,0.6);
  filter: blur(0.5px);
  mix-blend-mode: screen;
  opacity: 0;
  pointer-events: none;
}
.lp-mote1 { left: 38%; bottom: 18%; animation: lp-mote 9s ease-in-out infinite; }
.lp-mote2 { left: 60%; bottom: 12%; animation: lp-mote 11s ease-in-out 2.5s infinite; }
.lp-dead .lp-mote { animation-play-state: paused; opacity: 0; }

.lp-deathwash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, transparent 30%, rgba(6,8,16,0.55) 100%);
  opacity: 0;
  transition: opacity 0.85s ease;
  pointer-events: none;
}
.lp-dead .lp-deathwash { opacity: 1; }

@keyframes lp-breath {
  0%, 100% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.012) translateY(-1px); }
}
@keyframes lp-halo {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@keyframes lp-eye {
  0%, 100% { opacity: 0.62; transform: scale(0.94); }
  50% { opacity: 1; transform: scale(1.05); }
}
@keyframes lp-flare {
  0% { opacity: 0; transform: scale(0.6); }
  35% { opacity: 0.95; transform: scale(1.15); }
  100% { opacity: 0; transform: scale(1.5); }
}
@keyframes lp-mote {
  0% { opacity: 0; transform: translateY(0); }
  25% { opacity: 0.5; }
  75% { opacity: 0.35; }
  100% { opacity: 0; transform: translateY(-46px); }
}
@media (prefers-reduced-motion: reduce) {
  .lp-breath, .lp-eye, .lp-halo, .lp-mote { animation: none; }
}
`;

export default LivingPortrait;

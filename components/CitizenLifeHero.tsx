"use client";

import { useEffect, useRef, useState } from "react";
import { LivingPortrait } from "./remember/LivingPortrait";
import { eyeFor } from "@/lib/eye-positions";

/**
 * CitizenLifeHero — the FREELON, alive, wrapped around any citizen's art.
 *
 * Two beats, both built on the existing LivingPortrait CSS engine:
 *
 *  · AWAKENING (#2) — the portrait loads dead/grey, then on mount the light
 *    sparks, the breath starts and color floods back in. "Opening" a FREELON
 *    becomes a moment instead of a static thumbnail.
 *
 *  · DON'T LET IT DIE (#1) — leave it alone and it starts to fade, then the
 *    light goes out of its eye and the figure desaturates. Touch / hover / type
 *    and it revives with a flare. Pure loss-aversion: the page is literally
 *    asking you not to abandon it.
 *
 * Everything here is client-side and art-agnostic. The tracking hex EYE is only
 * drawn for tokens with a measured eye location (lib/eye-positions) — otherwise
 * the breath/awaken/death beats carry it, so it is never wrong on arbitrary art.
 *
 * Respects prefers-reduced-motion: it awakens once and then simply stays alive
 * (no neglect-death loop) for anyone who has asked the OS to calm motion.
 */

const AWAKEN_DELAY = 160; // ms dead before the spark — long enough to read "off"
const FADE_AFTER = 7000; // ms of neglect before the half-life begins
const DIE_AFTER = 14000; // ms of neglect before the light goes out

export function CitizenLifeHero({
  tokenId,
  src,
  name,
  fill = false,
  frame = true,
  size = 460,
  /** Turn off the neglect-death loop (e.g. tiny embeds where it'd just nag). */
  neglectDeath = true,
}: {
  tokenId: number;
  src: string;
  name?: string;
  fill?: boolean;
  frame?: boolean;
  size?: number;
  neglectDeath?: boolean;
}) {
  const eye = eyeFor(tokenId);

  // Start dead so the awakening has somewhere to come from.
  const [alive, setAlive] = useState(false);
  const [fading, setFading] = useState(false);
  const [neglectDead, setNeglectDead] = useState(false);
  const [flare, setFlare] = useState(0);
  const [awakening, setAwakening] = useState(true);

  const lastInteract = useRef(Date.now());
  const reduced = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // AWAKENING — flip to alive shortly after mount + fire the intake flare.
  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

    const t1 = setTimeout(() => {
      setAlive(true);
      setFlare((f) => f + 1);
      lastInteract.current = Date.now();
    }, AWAKEN_DELAY);
    const t2 = setTimeout(() => setAwakening(false), AWAKEN_DELAY + 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // DON'T LET IT DIE — interaction keeps it alive; silence lets it fade then die.
  useEffect(() => {
    if (!neglectDeath || reduced.current) return;

    const revive = () => {
      lastInteract.current = Date.now();
      setFading(false);
      setNeglectDead((wasDead) => {
        if (wasDead) setFlare((f) => f + 1); // revive flare only on a real return
        return false;
      });
      setAlive(true);
    };

    const el = wrapRef.current;
    el?.addEventListener("pointermove", revive, { passive: true });
    el?.addEventListener("pointerdown", revive, { passive: true });
    el?.addEventListener("touchstart", revive, { passive: true });

    const tick = setInterval(() => {
      const idle = Date.now() - lastInteract.current;
      if (idle > DIE_AFTER) {
        setAlive(false);
        setFading(false);
        setNeglectDead(true);
      } else if (idle > FADE_AFTER) {
        setFading(true);
      } else {
        setFading(false);
      }
    }, 700);

    return () => {
      clearInterval(tick);
      el?.removeEventListener("pointermove", revive);
      el?.removeEventListener("pointerdown", revive);
      el?.removeEventListener("touchstart", revive);
    };
  }, [neglectDeath]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: fill ? "100%" : undefined }}>
      <style>{`
        @keyframes lifehero-cap {
          0% { opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes lifehero-fadein { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          [data-lifehero-cap] { animation: none; opacity: 0; }
        }
      `}</style>
      <LivingPortrait
        src={src}
        alive={alive}
        fading={fading}
        flareSignal={flare}
        showEye={!!eye}
        eyeX={eye?.x}
        eyeY={eye?.y}
        eyeColor={eye?.color}
        eyeCore={eye?.core}
        frame={frame}
        fill={fill}
        size={size}
        alt={name ? `${name} — living portrait` : "FREELON citizen — living portrait"}
      />

      {/* AWAKENING caption — a one-shot "it's waking up" beat, then gone. */}
      {awakening && (
        <div style={captionBase} aria-hidden>
          ⬡ AWAKENING…
        </div>
      )}

      {/* DON'T LET IT DIE — the share-able loss-aversion prompt when neglected. */}
      {neglectDead && (
        <div style={dieOverlay} aria-hidden>
          <div style={dieKicker}>⬡ THE LIGHT WENT OUT</div>
          <div style={diePrompt}>Don&apos;t let it die — touch it.</div>
        </div>
      )}
    </div>
  );
}

const captionBase: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 12,
  textAlign: "center",
  fontFamily: "var(--mono2)",
  fontSize: 11,
  letterSpacing: "0.24em",
  color: "var(--gold-bright, #ffe9b0)",
  textShadow: "0 1px 10px rgba(0,0,0,0.9)",
  pointerEvents: "none",
  animation: "lifehero-cap 1.6s ease-out forwards",
};

const dieOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  paddingBottom: "12%",
  gap: 4,
  pointerEvents: "none",
  background: "radial-gradient(circle at 50% 40%, transparent 30%, rgba(4,5,10,0.55) 100%)",
  animation: "lifehero-fadein 0.85s ease forwards",
};
const dieKicker: React.CSSProperties = {
  fontFamily: "var(--mono2)",
  fontSize: 10,
  letterSpacing: "0.26em",
  color: "rgba(245,242,232,0.5)",
};
const diePrompt: React.CSSProperties = {
  fontFamily: "var(--display, ui-serif)",
  fontSize: "clamp(15px,2.4vw,20px)",
  color: "#f5f2e8",
  textShadow: "0 2px 14px rgba(0,0,0,0.9)",
};

export default CitizenLifeHero;

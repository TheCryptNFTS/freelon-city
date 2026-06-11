"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./DossierBeats.module.css";

/**
 * RevealOnScroll — reusable staged-entrance wrapper (dossier 3-beat PDP,
 * 2026-06-11). Copies the shipped progressive-enhancement pattern of
 * components/ScrollReveal.tsx + globals `.reveal`: the server renders content
 * VISIBLE (no-JS / crawler safe); on mount JS hides the block, then rises it
 * in ONCE — 600ms var(--ease-out-quint), translateY(24px)→0, delayed
 * `index` × 70ms so sibling beats stagger. Blocks already in the viewport at
 * mount rise immediately (the page-load entrance); blocks below the fold rise
 * the first time the IntersectionObserver sees them (stagger delay dropped
 * there so a lone scroll-reveal never feels laggy). Reduced-motion users
 * never see content hidden or moved (JS bails out + CSS guard).
 */
export function RevealOnScroll({
  index = 0,
  className,
  children,
}: {
  /** Stagger slot — entrance delay is index × 70ms. */
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Above the fold at mount: hide, then rise on the next painted frame —
    // the staged page-load entrance (double rAF so the hidden state commits
    // before the transition starts).
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.92) {
      el.setAttribute("data-rise", "0");
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => el.setAttribute("data-rise", "1"))
      );
      return () => cancelAnimationFrame(raf);
    }

    // Below the fold: rise once on first intersection.
    el.setAttribute("data-rise", "0");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.transitionDelay = "0s";
            e.target.setAttribute("data-rise", "1");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className ? `${styles.rise} ${className}` : styles.rise}
      style={{ "--rise-i": index } as CSSProperties}
    >
      {children}
    </div>
  );
}

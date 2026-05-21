"use client";
import { useEffect } from "react";

// Linear-style mouse-tracking spotlight. Tracks the cursor and exposes
// --mx / --my CSS vars on <body> so any surface can use them.
export function Spotlight() {
  useEffect(() => {
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
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return null;
}

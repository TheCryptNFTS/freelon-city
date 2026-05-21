"use client";
import { useEffect } from "react";

export function ScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const vh = window.innerHeight;
    // Stage: hide only those below the fold. Above-fold reveals stay visible.
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top > vh * 0.92) el.setAttribute("data-rv", "0");
    });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-rv", "1");
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => { if (el.getAttribute("data-rv") === "0") io.observe(el); });
    return () => io.disconnect();
  }, []);
  return null;
}

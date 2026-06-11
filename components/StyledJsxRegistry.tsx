"use client";

/**
 * styled-jsx SSR registry — the standard App Router pattern from the Next.js
 * CSS-in-JS docs.
 *
 * PERF/CLS 2026-06-11: without this, styled-jsx styles from client components
 * (today only SignalInventory's ~200 rules) were NEVER server-rendered — the
 * panel arrived unstyled and snapped into shape at hydration. Lighthouse
 * attributed a 0.084 layout shift on /collections to exactly that. With the
 * registry, the <style> tags stream inside the SSR HTML and the panel paints
 * styled on first render.
 */
import { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { StyleRegistry, createStyleRegistry } from "styled-jsx";

export function StyledJsxRegistry({ children }: { children: React.ReactNode }) {
  // Lazy initial state: one registry per request on the server.
  const [registry] = useState(() => createStyleRegistry());

  useServerInsertedHTML(() => {
    const styles = registry.styles();
    registry.flush();
    return <>{styles}</>;
  });

  return <StyleRegistry registry={registry}>{children}</StyleRegistry>;
}

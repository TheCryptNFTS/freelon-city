"use client";

import { useEffect } from "react";

/**
 * Client-side bounce. Crawlers (the X card bot) read the server-rendered OG
 * meta tags and never run this; humans who open the link get sent straight to
 * the game so the share doubles as a recruitment funnel.
 */
export function Redirect({ to }: { to: string }) {
  useEffect(() => {
    const t = setTimeout(() => {
      window.location.replace(to);
    }, 600);
    return () => clearTimeout(t);
  }, [to]);
  return null;
}

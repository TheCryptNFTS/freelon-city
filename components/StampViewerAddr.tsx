"use client";
import { useEffect } from "react";

/**
 * Writes the visited wallet address into a non-HttpOnly `freelon_addr`
 * cookie so client features that need the viewer's address (Watchlist
 * button, etc.) can read it without re-asking. 30-day TTL.
 *
 * Not used for auth — purely a UX hint. Auth still relies on the HMAC
 * x-session cookie.
 */
export function StampViewerAddr({ addr }: { addr: string }) {
  useEffect(() => {
    if (!addr) return;
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    document.cookie = `freelon_addr=${encodeURIComponent(addr.toLowerCase())}; path=/; max-age=${maxAge}; samesite=lax`;
  }, [addr]);
  return null;
}

"use client";
import { useEffect } from "react";
import { stampViewerAddr } from "@/lib/viewer-cookie";

/**
 * Writes the visited wallet address into a non-HttpOnly `freelon_addr`
 * cookie so client features that need the viewer's address (Watchlist
 * button, etc.) can read it without re-asking. 30-day TTL, scoped across
 * apex + www via the shared helper.
 *
 * Not used for auth — purely a UX hint. Auth still relies on the HMAC
 * x-session cookie.
 */
export function StampViewerAddr({ addr }: { addr: string }) {
  useEffect(() => {
    if (!addr) return;
    stampViewerAddr(addr);
  }, [addr]);
  return null;
}

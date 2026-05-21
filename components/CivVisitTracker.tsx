"use client";
import { useEffect } from "react";
import { markCivSeen } from "@/lib/secrets-store";

// Drop this on a civilization page; it silently records that the visitor
// has now seen that civ. After all 10 civs are seen, the "ALL DOCTRINES"
// badge appears on the /carrier profile.
export function CivVisitTracker({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;
    markCivSeen(slug);
  }, [slug]);
  return null;
}

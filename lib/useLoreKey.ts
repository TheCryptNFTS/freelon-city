"use client";
import { useEffect, useState } from "react";

/**
 * Emile = "Memory Fragments" → the lore-unlock master key. When the connected
 * wallet holds ≥1 Emile, every citizen's deep lore reveals for free, the same
 * way owning a citizen reveals its own. Resolves the holding server-side via
 * /api/lore-key (keeps the OpenSea key off the client). Fail-quiet: any error
 * leaves hasKey false, so a failed lookup never falsely grants the key.
 */
export function useLoreKey(walletAddress: string | null): {
  loading: boolean;
  hasKey: boolean;
} {
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setHasKey(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/lore-key?addr=${walletAddress.toLowerCase()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setHasKey(!!d.key);
      })
      .catch(() => {
        if (!cancelled) setHasKey(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  return { loading, hasKey };
}

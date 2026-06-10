"use client";
import { useEffect } from "react";
import { getWalletAddress } from "@/lib/get-wallet-address";

type Props = {
  questId: "city-tourist" | "archivist" | "hex-hunter" | "doctrine-master";
  stepId: string;
};

/**
 * Fire-and-forget quest step marker. Reads the wallet address OR carrier
 * handle from localStorage and posts to /api/quests/[questId].
 *
 * Drop one of these on a page (e.g. civilization page → stepId=civSlug;
 * honoree deep-lore panel → stepId="honoree:<handle>") and the user's
 * progress accrues automatically. If they complete a quest, the API
 * credits hex and returns { justCompleted: true, rewardHex: N }.
 */
export function QuestTracker({ questId, stepId }: Props) {
  useEffect(() => {
    (async () => {
      try {
        let key: string | null = null;
        // Prefer wallet address if available
        const w = await getWalletAddress();
        if (w) key = w;

        // Fall back to carrier handle
        if (!key) {
          const carrierRaw = localStorage.getItem("freelon::carrier::v1");
          if (carrierRaw) {
            const parsed = JSON.parse(carrierRaw) as { handle?: string };
            if (parsed?.handle) key = parsed.handle.toLowerCase();
          }
        }
        if (!key) return; // Anonymous visitor — no progress tracked

        // Local dedupe — don't spam the API for repeat visits in the same session
        const localKey = `freelon::quest::${questId}::${stepId}::${key}`;
        if (sessionStorage.getItem(localKey)) return;
        sessionStorage.setItem(localKey, "1");

        fetch(`/api/quests/${encodeURIComponent(questId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, stepId }),
          keepalive: true,
        })
          .then(async (r) => {
            const j = (await r.json().catch(() => ({}))) as {
              justCompleted?: boolean;
              rewardHex?: number;
              error?: string;
            };
            if (j.justCompleted && j.rewardHex) {
              // Fire a small toast event for any listening UI
              window.dispatchEvent(
                new CustomEvent("freelon:quest-complete", {
                  detail: { questId, reward: j.rewardHex },
                }),
              );
              return;
            }
            if (!r.ok) {
              // Failed — don't burn the session dedupe, so the step retries
              // on the next visit instead of being silently lost.
              sessionStorage.removeItem(localKey);
              // Phase 0 gate: wallet keys need a one-time signature. Surface
              // it ONCE per session instead of failing silently forever.
              const nagKey = "freelon::quest::proof-nag";
              if (j.error === "wallet_proof_required" && !sessionStorage.getItem(nagKey)) {
                sessionStorage.setItem(nagKey, "1");
                window.dispatchEvent(new CustomEvent("freelon:quest-blocked"));
              }
            }
          })
          .catch(() => {
            try { sessionStorage.removeItem(localKey); } catch {}
          });
      } catch {
        /* never break the page */
      }
    })();
  }, [questId, stepId]);

  return null;
}

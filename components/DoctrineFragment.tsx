"use client";
import { useEffect, useState } from "react";
import { getWalletAddress } from "@/lib/get-wallet-address";

type Props = { stepId: string; fragment: string };

async function readKey(): Promise<string | null> {
  try {
    const w = await getWalletAddress();
    if (w) return w;
    const carrierRaw = localStorage.getItem("freelon::carrier::v1");
    if (carrierRaw) {
      const parsed = JSON.parse(carrierRaw) as { handle?: string };
      if (parsed?.handle) return parsed.handle.toLowerCase();
    }
  } catch {
    /* noop */
  }
  return null;
}

/**
 * Hidden doctrine fragment on civilization pages. Clicking reveals the line
 * and credits one step toward the "doctrine-master" quest (10 fragments,
 * +500 ⬡ on completion). Server is idempotent — re-clicking re-posts but
 * never double-credits.
 */
export function DoctrineFragment({ stepId, fragment }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);

  // Load persisted reveal state on mount.
  useEffect(() => {
    try {
      const lsKey = `freelon::doctrine-fragment::revealed::${stepId}`;
      if (localStorage.getItem(lsKey)) setRevealed(true);
    } catch {
      /* noop */
    }
  }, [stepId]);

  function onClick() {
    const firstReveal = !revealed;
    if (firstReveal) {
      try {
        localStorage.setItem(
          `freelon::doctrine-fragment::revealed::${stepId}`,
          "1",
        );
      } catch {
        /* noop */
      }
      setRevealed(true);
    }
    // Flash the "FRAGMENT RECORDED" badge briefly.
    setJustClaimed(true);
    window.setTimeout(() => setJustClaimed(false), 2200);

    // Post to quests API. Server is idempotent — safe to re-post.
    (async () => {
      try {
        const key = await readKey();
        if (!key) return;
        fetch(`/api/quests/doctrine-master`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, stepId }),
          keepalive: true,
        })
          .then((r) => r.json())
          .then((j: { justCompleted?: boolean; rewardHex?: number }) => {
            if (j.justCompleted && j.rewardHex) {
              window.dispatchEvent(
                new CustomEvent("freelon:quest-complete", {
                  detail: { questId: "doctrine-master", reward: j.rewardHex },
                }),
              );
            }
          })
          .catch(() => {});
      } catch {
        /* never break the page */
      }
    })();
  }

  const cls = [
    "doctrine-fragment",
    revealed ? "revealed" : "",
    justClaimed ? "just-claimed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label="Doctrine fragment"
    >
      {fragment}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { getWalletAddress } from "@/lib/get-wallet-address";
import { proveWallet } from "@/lib/wallet-proof";

type Toast = {
  id: string;
  kind: "complete" | "blocked";
  questId?: string;
  reward?: number;
};

const QUEST_LABEL: Record<string, string> = {
  "city-tourist": "CITY TOURIST",
  archivist: "ARCHIVIST",
  "hex-hunter": "HEX HUNTER",
  "doctrine-master": "DOCTRINE MASTER",
};

export function QuestToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [signState, setSignState] = useState<"idle" | "busy" | "ok" | "fail">("idle");

  async function signNow(toastId: string) {
    setSignState("busy");
    const addr = await getWalletAddress().catch(() => null);
    const r = addr ? await proveWallet(addr) : { ok: false as const };
    setSignState(r.ok ? "ok" : "fail");
    if (r.ok) {
      try { sessionStorage.removeItem("freelon::quest::proof-nag"); } catch {}
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== toastId)), 1800);
    }
  }

  useEffect(() => {
    function push(t: Omit<Toast, "id">, ttl: number) {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, ...t }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, ttl);
    }
    function onComplete(ev: Event) {
      const e = ev as CustomEvent<{ questId?: string; reward?: number }>;
      if (!e.detail?.questId || !e.detail?.reward) return;
      push({ kind: "complete", questId: e.detail.questId, reward: e.detail.reward }, 6000);
    }
    // Quest progress hit the wallet-proof gate — tell the user instead of
    // failing silently (QuestTracker fires this once per session).
    function onBlocked() {
      push({ kind: "blocked" }, 9000);
    }
    window.addEventListener("freelon:quest-complete", onComplete);
    window.addEventListener("freelon:quest-blocked", onBlocked);
    return () => {
      window.removeEventListener("freelon:quest-complete", onComplete);
      window.removeEventListener("freelon:quest-blocked", onBlocked);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="quest-toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="quest-toast">
          {t.kind === "blocked" ? (
            <>
              <span className="qt-kicker">⬡ QUEST PROGRESS PAUSED</span>
              <span className="qt-title">SIGNATURE NEEDED</span>
              <button
                type="button"
                className="qt-reward"
                style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit" }}
                onClick={() => signNow(t.id)}
                disabled={signState === "busy"}
              >
                {signState === "busy"
                  ? "Check your wallet…"
                  : signState === "ok"
                    ? "✓ Signed — quests are tracking"
                    : signState === "fail"
                      ? "Couldn't sign — tap to retry"
                      : "Sign now (free, not a transaction) →"}
              </button>
            </>
          ) : (
            <>
              <span className="qt-kicker">⬡ QUEST COMPLETE</span>
              <span className="qt-title">{QUEST_LABEL[t.questId!] || t.questId!.toUpperCase()}</span>
              <span className="qt-reward">+{t.reward!.toLocaleString()} ⬡</span>
            </>
          )}
          <button
            type="button"
            className="qt-close"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

type Toast = {
  id: string;
  questId: string;
  reward: number;
};

const QUEST_LABEL: Record<string, string> = {
  "city-tourist": "CITY TOURIST",
  archivist: "ARCHIVIST",
  "hex-hunter": "HEX HUNTER",
  "doctrine-master": "DOCTRINE MASTER",
};

export function QuestToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onComplete(ev: Event) {
      const e = ev as CustomEvent<{ questId?: string; reward?: number }>;
      if (!e.detail?.questId || !e.detail?.reward) return;
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [
        ...prev,
        { id, questId: e.detail.questId!, reward: e.detail.reward! },
      ]);
      // Auto-dismiss after 6s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    }
    window.addEventListener("freelon:quest-complete", onComplete);
    return () => window.removeEventListener("freelon:quest-complete", onComplete);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="quest-toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="quest-toast">
          <span className="qt-kicker">⬡ QUEST COMPLETE</span>
          <span className="qt-title">{QUEST_LABEL[t.questId] || t.questId.toUpperCase()}</span>
          <span className="qt-reward">+{t.reward.toLocaleString()} ⬡</span>
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

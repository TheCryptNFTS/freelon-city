"use client";
import { useEffect, useState } from "react";
import { markGhost404 } from "@/lib/secrets-store";

// Active window: 04:04:00 UTC through 04:08:04 UTC (4 minutes 04 seconds)
const WINDOW_MS = 4 * 60 * 1000 + 4 * 1000; // 244,000 ms

type State = {
  active: boolean;
  msUntilOpen: number;   // ms until next open (when inactive)
  msUntilClose: number;  // ms until close (when active)
};

function computeState(now: Date): State {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const todayOpen = Date.UTC(y, m, d, 4, 4, 0, 0);
  const tomorrowOpen = Date.UTC(y, m, d + 1, 4, 4, 0, 0);
  const ts = now.getTime();

  if (ts >= todayOpen && ts < todayOpen + WINDOW_MS) {
    return { active: true, msUntilOpen: 0, msUntilClose: todayOpen + WINDOW_MS - ts };
  }
  const nextOpen = ts < todayOpen ? todayOpen : tomorrowOpen;
  return { active: false, msUntilOpen: nextOpen - ts, msUntilClose: 0 };
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function FourOFourEvent() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!now) return;
    const s = computeState(now);
    if (s.active) {
      try { markGhost404(); } catch {}
    }
  }, [now]);

  if (!now) return null;
  const s = computeState(now);

  if (s.active) {
    return (
      <div className="four-event active" role="status" aria-live="polite">
        ⬡⬡⬡ THE FIFTH BRACKET IS OPEN · CLOSES IN {fmt(s.msUntilClose)} ⬡⬡⬡
      </div>
    );
  }
  return (
    <div className="four-event" role="status">
      ⬡ The Fifth Bracket opens at 04:04 UTC · in {fmt(s.msUntilOpen)}
    </div>
  );
}

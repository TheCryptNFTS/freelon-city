"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getDailyMission, utcDayKey, type Mission } from "@/lib/daily-mission";

function readKey(): string | null {
  try {
    const w =
      typeof window !== "undefined"
        ? (window as unknown as { ethereum?: { selectedAddress?: string } })
            .ethereum?.selectedAddress
        : null;
    if (w && /^0x[a-fA-F0-9]{40}$/.test(w)) return w.toLowerCase();
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

export function DailyMission() {
  const [mission, setMission] = useState<Mission | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [dayKey, setDayKey] = useState<string>("");

  useEffect(() => {
    const m = getDailyMission(new Date());
    const day = utcDayKey();
    setMission(m);
    setDayKey(day);
    try {
      const key = readKey() || "anon";
      const lsKey = `freelon::mission::done::${m.id}::${day}::${key}`;
      if (localStorage.getItem(lsKey)) setClaimed(true);
    } catch {
      /* noop */
    }
  }, []);

  if (!mission) return null;

  function onClick() {
    if (!mission) return;
    try {
      const key = readKey();
      const lsKey = `freelon::mission::done::${mission.id}::${dayKey}::${key ?? "anon"}`;
      // Mark locally immediately so UI reflects state on return.
      localStorage.setItem(lsKey, "1");
      setClaimed(true);
      if (key) {
        // Fire-and-forget server claim. Server is idempotent.
        fetch(`/api/mission/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, missionId: mission.id }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* never break navigation */
    }
  }

  return (
    <section className="daily-mission" aria-label="Daily mission">
      <div className="dm-body">
        <span className="kicker">{mission.kicker}</span>
        <h3>{mission.title}</h3>
        <span className="dm-desc">{mission.description}</span>
      </div>
      {claimed ? (
        <span className="dm-claimed">✓ CLAIMED TODAY</span>
      ) : (
        <Link
          className="btn btn-gold dm-cta"
          href={mission.href}
          onClick={onClick}
        >
          <span className="lbl">+{mission.reward} ⬡</span>
          <span className="ttl">
            {mission.cta}
          </span>
        </Link>
      )}
    </section>
  );
}

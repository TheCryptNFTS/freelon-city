"use client";

type Milestone = {
  tier: "static" | "carrier" | "fire" | "ghost" | "dead" | "saint";
  label: string;
};

function milestoneFor(streak: number): Milestone | null {
  if (streak <= 0) return null;
  if (streak >= 404) return { tier: "saint", label: "⬡ THE 404 SAINT" };
  if (streak >= 100) return { tier: "dead", label: "DEAD MAN'S SWITCH" };
  if (streak >= 30) return { tier: "ghost", label: "CITY GHOST" };
  if (streak >= 8) return { tier: "fire", label: "DAYS OF FIRE" };
  if (streak >= 4) return { tier: "carrier", label: "SIGNAL CARRIER" };
  return { tier: "static", label: "STATIC HEARD" };
}

export function StreakBadge({ streak }: { streak: number }) {
  const m = milestoneFor(streak);
  if (!m) return null;
  return (
    <span className="streak-badge" data-tier={m.tier} title={`${streak} day streak`}>
      <strong>{streak}d</strong>
      <span>{m.label}</span>
    </span>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/track";

type CheckIn = { tokenId: number; day: string; line: string; level: number; className: string; streak?: number; isReturn?: boolean };

type Props = {
  citizenId: number;
  /** Server-provided: today's line if already generated, and the citizen's rank. */
  initial: CheckIn | null;
  rank: number | null;
};

export function CitizenCheckIn({ citizenId, initial, rank }: Props) {
  const [checkin, setCheckin] = useState<CheckIn | null>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If the server didn't have today's line, the component can request it (free).
  useEffect(() => {
    setCheckin(initial);
  }, [initial]);

  // The one retention signal that proves the thesis: did anyone view a check-in
  // on day 2+ (is_return), and how deep is the streak? tokenId+day is a joinable
  // return key, so this beats Vercel's cookieless blindness. Fire once per view.
  const fired = useRef(false);
  useEffect(() => {
    if (checkin && !fired.current) {
      fired.current = true;
      trackEvent("checkin_viewed", {
        tokenId: citizenId,
        streak: checkin.streak ?? 1,
        is_return: !!checkin.isReturn,
      });
    }
  }, [checkin, citizenId]);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/citizens/${citizenId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.checkin) {
        setCheckin(d.checkin);
      } else {
        setErr(d.error || "The citizen is silent right now — try again shortly.");
      }
    } catch {
      setErr("Couldn't reach the citizen — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="checkin">
      <div className="checkin-hd">
        <span className="kicker">⬡ TODAY&apos;S TRANSMISSION</span>
        {checkin && (checkin.streak ?? 1) >= 2 ? (
          <span className="checkin-rank">⬡ {checkin.streak}-DAY THREAD</span>
        ) : rank ? (
          <span className="checkin-rank">RANK #{rank.toLocaleString()} · BY LEVEL</span>
        ) : null}
      </div>

      {checkin ? (
        <blockquote className="checkin-line">{checkin.line}</blockquote>
      ) : (
        <div className="checkin-empty">
          <p className="checkin-prompt">This citizen hasn&apos;t transmitted today.</p>
          <button className="btn checkin-btn" type="button" onClick={generate} disabled={busy}>
            <span className="ttl">{busy ? "RECEIVING…" : "RECEIVE TODAY'S TRANSMISSION →"}</span>
          </button>
        </div>
      )}
      {err && <p className="checkin-err">{err}</p>}
    </section>
  );
}

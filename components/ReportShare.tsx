"use client";

import { trackEvent } from "@/lib/track";
import { tweetIntent, tweetSignalReport } from "@/lib/share";

/**
 * POST THE REPORT — the one-tap ritual share on /report (2026-06-10).
 * Same template the Sunday @4040hex cron posts, so a holder's share and
 * the city's own post read as one voice. Tracked as report_share; the link
 * carries ?ref=sr-<week> so referral_landing attributes what it pulls in.
 */
export function ReportShare({
  week,
  winnerName,
  notableCount,
}: {
  week: string;
  winnerName: string | null;
  notableCount: number;
}) {
  const text = tweetSignalReport({ week, winnerName, notableCount });
  return (
    <a
      className="btn btn-primary btn-lg"
      href={tweetIntent(text)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("report_share", { week })}
    >
      <span className="ttl">POST THE REPORT →</span>
    </a>
  );
}

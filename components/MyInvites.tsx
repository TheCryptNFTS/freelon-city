"use client";
import { useEffect, useState } from "react";

type Referral = {
  referrer: string;
  joiner: string;
  joinerAddress?: string;
  ts: number;
  rewarded: boolean;
};

type ApiResponse = {
  ok: boolean;
  count?: number;
  entries?: Referral[];
};

export function MyInvites({ handle }: { handle: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    fetch(`/api/referral?key=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((j: ApiResponse) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setData({ ok: false });
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  // Invite links land newcomers on the free, no-wallet chat (the wedge), not the
  // owner hub. `?r=` binds the referral (middleware → freelon_ref cookie, read by
  // the X-OAuth callback); `?ref=inv-<handle>` tags the funnel so invites are no
  // longer invisible in analytics (referral_landing fires via ReferralBeacon).
  const link = `freeloncity.com/demo?r=${handle}&ref=inv-${handle}`;
  const fullLink = `https://${link}`;

  function onCopy() {
    try {
      navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  const count = data?.count ?? 0;
  const entries = data?.entries ?? [];

  return (
    <div className="invites" style={{ gridColumn: "1 / -1" }}>
      <span className="kicker">⬡ INVITES SENT · {count}</span>
      {entries.length === 0 ? (
        <div className="invites-empty">
          Share your invite link to bring others into the city.
        </div>
      ) : (
        <ul className="invites-list">
          {entries.map((e) => (
            <li key={e.joiner + e.ts}>
              <span>@{e.joiner}</span>
              <span>
                {new Date(e.ts).toISOString().slice(0, 10)} ·{" "}
                {e.rewarded ? "✓" : "pending verify"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="invites-link">
        <input type="text" value={link} readOnly onFocus={(ev) => ev.currentTarget.select()} />
        <button type="button" onClick={onCopy}>
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
    </div>
  );
}

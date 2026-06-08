"use client";

import { tweetCarrierOfWeek, tweetIntent, shareCarrierUrl } from "@/lib/share";

/**
 * One-tap share of the Carrier-of-the-Week winner card. Posts the copy-safe
 * tweet (recognition framing only) whose embedded /carrier-of-the-week?ref=
 * link unfurls into the /api/og/carrier image and lets ReferralBeacon measure
 * inbound from the share.
 */
export function CarrierShare(props: {
  weekKey: string;
  tokenId: number;
  name: string;
  civName: string;
  level: number;
  className: string;
}) {
  const text = tweetCarrierOfWeek(props);
  const href = tweetIntent(text);

  function copy() {
    try {
      navigator.clipboard.writeText(shareCarrierUrl(props.weekKey));
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <a href={href} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ textDecoration: "none" }}>
        <span className="lbl">SHARE</span>
        <span className="ttl">POST TO X <span className="ar">↗</span></span>
      </a>
      <button onClick={copy} className="btn" type="button">
        <span className="ttl">COPY LINK</span>
      </button>
    </>
  );
}

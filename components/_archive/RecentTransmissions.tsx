"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { heroImageUrl } from "@/lib/constants";

type SaleEvent = {
  tokenId: number;
  name?: string;
  priceEth?: string | null;
  ts?: number | null;
};

function timeAgo(ts: number | null | undefined) {
  if (!ts) return "—";
  const sec = Math.floor((Date.now() / 1000) - ts);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function RecentTransmissions() {
  const [events, setEvents] = useState<SaleEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/opensea/recent")
      .then((r) => r.json())
      .then((d) => { setEvents(d.events || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);
  if (loaded && events.length === 0) {
    return null;
  }
  return (
    <section className="transmissions reveal">
      <div style={{ maxWidth: "var(--maxw)", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <h2>
            Recent <em>transmissions</em>
          </h2>
          <a href="https://opensea.io/collection/freelons/activity" target="_blank" rel="noreferrer" style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "var(--ink-2)" }}>
            FULL ACTIVITY ↗
          </a>
        </div>
        <div className="transmission-list">
          {events.slice(0, 6).map((ev, i) => (
            <Link href={`/citizens/${ev.tokenId}`} key={i} className="transmission-row" style={{ textDecoration: "none" }}>
              <div className="thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImageUrl(ev.tokenId)}
                  alt={`Citizen #${ev.tokenId}`}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><polygon points='24,4 42,14 42,34 24,44 6,34 6,14' fill='none' stroke='%23c8aa64' stroke-width='2'/></svg>";
                  }}
                />
              </div>
              <div>
                <div className="id">#{ev.tokenId.toString().padStart(4, "0")}</div>
                <div className="name" style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 4 }}>{ev.name || `Citizen #${ev.tokenId}`}</div>
              </div>
              <div className="price">{ev.priceEth ? `${ev.priceEth} ETH` : "—"}</div>
              <div className="time">{timeAgo(ev.ts)}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

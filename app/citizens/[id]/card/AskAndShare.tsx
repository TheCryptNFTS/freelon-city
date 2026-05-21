"use client";

import { useState } from "react";

type Props = {
  tokenId: number;
  id4: string;
  displayName: string;
  civilizationName: string;
  shape: string;
  lastSale: number | null;
  openseaUrl: string;
};

function formatEth(n: number | null): string {
  if (n == null) return "—";
  // Trim trailing zeros, max 4 decimals
  const s = n.toFixed(4);
  return parseFloat(s).toString();
}

export function AskAndShare({
  tokenId,
  id4,
  displayName,
  civilizationName,
  shape,
  lastSale,
  openseaUrl,
}: Props) {
  const defaultAsk =
    lastSale != null ? parseFloat((lastSale * 1.1).toFixed(4)).toString() : "";
  const [ask, setAsk] = useState<string>(defaultAsk);

  const askNumber = parseFloat(ask);
  const askDisplay = !isNaN(askNumber) && askNumber > 0 ? formatEth(askNumber) : "—";

  const tweet =
    `⬡ Listing FREELON CITY #${id4} — ${displayName}\n\n` +
    `Last sale: ${formatEth(lastSale)} ETH\n` +
    `Ask: ${askDisplay} ETH\n\n` +
    `${civilizationName} · ${shape}\n\n` +
    `freeloncity.com/citizens/${tokenId}/card`;

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  const canShare = !isNaN(askNumber) && askNumber > 0;

  const [downloading, setDownloading] = useState(false);
  const [downloadErr, setDownloadErr] = useState<string | null>(null);

  async function downloadPng() {
    if (downloading) return;
    setDownloading(true);
    setDownloadErr(null);
    try {
      const r = await fetch(`/api/og/card/${tokenId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const ct = r.headers.get("content-type") || "";
      if (!ct.startsWith("image/")) throw new Error("Bad response");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `freelon-city-${id4}-listing.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadErr("DOWNLOAD FAILED — RETRY");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="card-sales">
        <div className="price-box">
          <span className="label">LAST SALE</span>
          <div className="value">{formatEth(lastSale)} ETH</div>
        </div>
        <div className="price-box">
          <span className="label">ASK</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            placeholder="0.00"
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            aria-label="Ask price in ETH"
          />
        </div>
      </div>

      <div className="card-actions">
        <a
          className={`btn btn-gold${canShare ? "" : " is-disabled"}`}
          href={canShare ? tweetUrl : undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!canShare}
          onClick={(e) => {
            if (!canShare) e.preventDefault();
          }}
        >
          <span className="ttl">SHARE LISTING ON X →</span>
        </a>
        <a className="btn" href={openseaUrl} target="_blank" rel="noreferrer">
          <span className="ttl">LIST ON OPENSEA ↗</span>
        </a>
        <button
          type="button"
          className="btn"
          onClick={downloadPng}
          disabled={downloading}
        >
          <span className="ttl">
            {downloading
              ? "DOWNLOADING…"
              : downloadErr
              ? downloadErr
              : "DOWNLOAD PNG ↓"}
          </span>
        </button>
      </div>
    </>
  );
}

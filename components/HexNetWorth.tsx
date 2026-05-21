"use client";
import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";

export function HexNetWorth() {
  const h = useHolder();
  const [floor, setFloor] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/opensea/stats").then(r => r.json()).then(d => setFloor(d.floor || 0)).catch(() => {});
  }, []);

  if (!h.address) {
    return <div className="net-worth-empty">Connect wallet to see your Hex Net Worth.</div>;
  }
  if (h.loading || floor === null) return <div className="net-worth-empty">Calculating…</div>;
  const balance = h.balance ?? 0;
  const value = balance * floor;
  return (
    <div className="net-worth">
      <span className="kicker">⬡ HEX NET WORTH</span>
      <div className="nw-value">{value.toFixed(4)} ETH</div>
      <div className="nw-detail">{balance} citizen{balance !== 1 ? "s" : ""} · floor {floor.toFixed(4)} ETH each</div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";

type NetWorth = {
  value: number;
  balance: number;
  globalFloor: number;
  civs: Array<{ civ: string; count: number; floor: number; value: number }>;
};

export function HexNetWorth() {
  const h = useHolder();
  const [data, setData] = useState<NetWorth | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!h.address) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/wallet/${h.address}/net-worth`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [h.address]);

  if (!h.address) {
    return (
      <div className="net-worth-empty">
        Connect wallet to see your Hex Net Worth.
      </div>
    );
  }
  if (loading || !data) return (
    <div className="net-worth-empty">
      <div className="shimmer-row" style={{ height: 36, marginBottom: 8, width: "60%" }} />
      <div className="shimmer-row" style={{ height: 12, width: "40%" }} />
    </div>
  );
  return (
    <div className="net-worth">
      <span className="kicker">⬡ HEX NET WORTH</span>
      <div className="nw-value">{data.value.toFixed(4)} ETH</div>
      <div className="nw-detail">
        {data.balance} citizen{data.balance !== 1 ? "s" : ""} · priced per civilization · global floor {data.globalFloor.toFixed(4)} ETH
      </div>
    </div>
  );
}

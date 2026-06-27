"use client";
import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";

type NetWorth = {
  balance: number;
  civs: Array<{ civ: string; count: number }>;
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
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        // Guard the shape: an error/rate-limit body ({error:...}) is truthy but
        // lacks balance/civs — accepting it would crash on data.civs.length below.
        if (d && typeof d.balance === "number" && Array.isArray(d.civs)) setData(d);
        else setData(null);
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [h.address]);

  if (!h.address) {
    return (
      <div className="net-worth-empty">
        <span className="kicker">⬡ YOUR CITIZENS</span>
        <div className="nw-detail" style={{ marginTop: "var(--s-2)" }}>
          The city stats above are public. This card is yours — connect your
          wallet to see the citizens you hold and the work they carry.
        </div>
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
      <span className="kicker">⬡ CITIZENS HELD</span>
      <div className="nw-value">{data.balance}</div>
      <div className="nw-detail">
        {data.balance === 1 ? "FREELON" : "FREELONs"} in your wallet · across {data.civs.length} civilization{data.civs.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

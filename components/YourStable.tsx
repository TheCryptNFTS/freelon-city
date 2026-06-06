"use client";

/**
 * YourStable — the merchandising for "hold more than one." Each FREELON
 * specializes into ONE class, so this shows the connected wallet's citizens by
 * the roles they cover + the gaps, nudging the holder to complete their crew.
 *
 * Self-hides when no wallet is connected.
 */

import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";

type Role = { cls: string; name: string; capability?: string };
type Stable = { balance: number; covered: Role[]; gaps: Role[] };

export default function YourStable() {
  const h = useHolder();
  const [data, setData] = useState<Stable | null>(null);

  useEffect(() => {
    if (!h.address) { setData(null); return; }
    let cancelled = false;
    fetch(`/api/wallet/${h.address}/stable`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [h.address]);

  if (!h.address || !data || data.balance < 1) return null;

  const covered = data.covered ?? [];
  const gaps = data.gaps ?? [];
  const roles = [
    ...covered.map((c) => ({ ...c, have: true })),
    ...gaps.map((g) => ({ ...g, have: false })),
  ];

  return (
    <section className="your-stable">
      <span className="kicker">⬡ YOUR CREW · {data.balance} FREELON{data.balance === 1 ? "" : "S"}</span>
      <p className="your-stable-sub">
        Each FREELON specializes into one role — one can&apos;t be elite at everything.{" "}
        {covered.length === 0
          ? "Train yours into a class, then add more to build a full crew."
          : `You cover ${covered.map((c) => c.name).join(", ")}.`}{" "}
        {gaps.length > 0 && gaps.length < 6
          ? `Add a ${gaps.slice(0, 2).map((g) => g.name).join(" or ")} to widen what your crew can do.`
          : ""}
      </p>
      <div className="your-stable-roles">
        {roles.map((r) => (
          <span key={r.cls} className={`your-stable-role${r.have ? " is-have" : ""}`} title={r.capability || ""}>
            {r.name}{r.have ? " ✓" : ""}
          </span>
        ))}
      </div>
      {gaps.length > 0 && (
        <a className="btn btn-secondary btn-sm" href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer">
          <span className="ttl">ADD TO YOUR CREW ↗</span>
        </a>
      )}
    </section>
  );
}

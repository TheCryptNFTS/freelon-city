"use client";
import { useState } from "react";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

type Citizen = {
  id: number;
  civilization: string;
  tier: string;
};

const ALL_CITIZENS = citizensData as Citizen[];

type CivStats = {
  floor: number;
  civs: Array<{
    slug: string;
    name: string;
    color: string;
    population: number;
    floor: number;
  }>;
};

type RegretResult = {
  id: number;
  past: number;
  current: number;
  pct: number;
  level: "RELIEF" | "MILD" | "MODERATE" | "SEVERE" | "TERMINAL";
  civSlug: string;
  civName: string;
  civColor: string;
};

function classify(pct: number): RegretResult["level"] {
  if (pct < 0) return "RELIEF";
  if (pct < 25) return "MILD";
  if (pct < 100) return "MODERATE";
  if (pct < 300) return "SEVERE";
  return "TERMINAL";
}

export function RegretForm() {
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegretResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const id = Number(tokenId);
    const past = Number(price);
    if (!Number.isFinite(id) || id < 1 || id > 4040) {
      setError("Token id must be 1–4040.");
      return;
    }
    if (!Number.isFinite(past) || past <= 0) {
      setError("Past sale price must be positive ETH.");
      return;
    }

    setLoading(true);
    try {
      const citizen = ALL_CITIZENS[id - 1];
      const civSlug = citizen?.civilization ?? "blue-synthesis";
      const civDef = (CIVILIZATIONS as Record<string, { name: string; color: string }>)[civSlug];

      const r = await fetch("/api/opensea/civ-stats", { cache: "no-store" });
      const data = (await r.json()) as CivStats;
      const civRow = data.civs.find((c) => c.slug === civSlug);
      const current = (civRow?.floor && civRow.floor > 0) ? civRow.floor : data.floor;

      const pct = ((current - past) / past) * 100;
      const level = classify(pct);

      setResult({
        id,
        past,
        current,
        pct,
        level,
        civSlug,
        civName: civDef?.name ?? "Unknown",
        civColor: civDef?.color ?? "#c8aa64",
      });
    } catch {
      setError("Could not reach the machine. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const tweet = result
    ? `I sold FREELON #${result.id.toString().padStart(4, "0")} for ${result.past} ETH.\n\nRegret level: ${result.level} (${(result.pct >= 0 ? "+" : "") + result.pct.toFixed(0)}%)\n\nfreeloncity.com/regret`
    : "";
  const ogUrl = result
    ? `/api/og/regret?id=${result.id}&past=${result.past}&current=${result.current.toFixed(6)}&pct=${result.pct.toFixed(2)}`
    : "";
  const intent = result
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(`https://www.freeloncity.com${ogUrl}`)}`
    : "";

  return (
    <>
      <form className="machine-form" onSubmit={submit} autoComplete="off">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={4040}
          placeholder="Token id (1–4040)"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          required
        />
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          placeholder="Past sale price (ETH)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <input
          type="date"
          placeholder="Date (optional)"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <span className="ttl">{loading ? "COMPUTING REGRET…" : "COMPUTE REGRET →"}</span>
        </button>
      </form>

      {error && (
        <div className="machine-result" style={{ borderColor: "#c54a3a" }}>
          <span className="regret-level" data-level="SEVERE">ERROR</span>
          <p style={{ marginTop: 8 }}>{error}</p>
        </div>
      )}

      {result && (
        <div className="machine-result" style={{ borderColor: result.civColor }}>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(result.id)}
              alt={`Citizen #${result.id}`}
              width={200}
              height={200}
              style={{ width: 200, height: 200, objectFit: "cover", border: `1px solid ${result.civColor}` }}
            />
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3>#{result.id.toString().padStart(4, "0")}</h3>
              <div style={{ color: result.civColor, fontFamily: "var(--mono2)", letterSpacing: "0.2em", fontSize: 12, marginTop: 4 }}>
                {result.civName.toUpperCase()}
              </div>

              <dl style={{ marginTop: 16, fontFamily: "var(--mono2)", fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
                  <dt style={{ color: "var(--ink-2)" }}>YOU SOLD FOR</dt>
                  <dd style={{ color: "var(--ink)" }}>{result.past.toFixed(4)} ETH</dd>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
                  <dt style={{ color: "var(--ink-2)" }}>CURRENT VALUE</dt>
                  <dd style={{ color: "var(--gold)" }}>{result.current.toFixed(4)} ETH</dd>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <dt style={{ color: "var(--ink-2)" }}>DELTA</dt>
                  <dd>
                    {(result.pct >= 0 ? "+" : "")}
                    {result.pct.toFixed(1)}%
                  </dd>
                </div>
              </dl>

              <div style={{ marginTop: 16 }}>
                <div className="regret-level" data-level={result.level}>
                  REGRET: {result.level}
                </div>
                <p style={{ marginTop: 6, fontSize: 13, color: "var(--ink-2)" }}>
                  {regretCopy(result.level)}
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="btn btn-primary" href={intent} target="_blank" rel="noreferrer">
              <span className="ttl">GENERATE REGRET CARD →</span>
            </a>
            <a className="btn" href={ogUrl} target="_blank" rel="noreferrer">
              <span className="ttl">VIEW CARD ↗</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function regretCopy(level: RegretResult["level"]): string {
  switch (level) {
    case "RELIEF": return "You made the right call. The city did not reward this one.";
    case "MILD": return "Marginal. The signal moved without you, but not far.";
    case "MODERATE": return "You exited too early. The civilization compounded.";
    case "SEVERE": return "A carrier who left the city. The hex does not forget.";
    case "TERMINAL": return "Catastrophic exit. You are studied by the next generation.";
  }
}

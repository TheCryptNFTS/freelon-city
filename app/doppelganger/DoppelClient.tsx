"use client";
import { useState } from "react";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import { normalizeHandle } from "@/lib/sync";
import citizensData from "@/data/citizens.json";

type Citizen = {
  id: number;
  civilization: string;
  caste: string;
  shape: string;
  tier: string;
  transmission_name: string;
};
const ALL = citizensData as Citizen[];

const REASONS = [
  "chaotic posting pattern detected",
  "signal alignment confirmed",
  "doctrinal resonance detected",
  "hex-frequency match",
  "carrier signature isolated",
  "civilizational fingerprint matched",
  "transmission cadence overlap",
  "fracture pattern reconstructed",
  "void protocol echoed in handle",
  "your noise is their signature",
];

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

type Match = {
  handle: string;
  id: number;
  reason: string;
  civSlug: string;
  civName: string;
  civColor: string;
  name: string;
};

export function DoppelClient() {
  const [val, setVal] = useState("");
  const [match, setMatch] = useState<Match | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const handle = normalizeHandle(val) || "anon";
    const hash = fnv1a("doppel::" + handle);
    const id = (hash % 4040) + 1;
    const reason = REASONS[hash % REASONS.length];
    const citizen = ALL[id - 1];
    const civSlug = citizen?.civilization ?? "blue-synthesis";
    const civDef = (CIVILIZATIONS as Record<string, { name: string; color: string }>)[civSlug];
    setMatch({
      handle,
      id,
      reason,
      civSlug,
      civName: civDef?.name ?? "Unknown",
      civColor: civDef?.color ?? "#c8aa64",
      name: citizen?.transmission_name || `Citizen #${id.toString().padStart(4, "0")}`,
    });
  }

  const ogUrl = match ? `/api/og/doppel?h=${encodeURIComponent(match.handle)}` : "";
  const tweet = match
    ? `@${match.handle} → CITIZEN #${match.id.toString().padStart(4, "0")}\n\nMy doppelganger in FREELON CITY: ${match.name}\n${match.civName}\n\nfreeloncity.com/doppelganger`
    : "";
  const intent = match
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(`https://freeloncity.com${ogUrl}`)}`
    : "";

  return (
    <>
      <form className="machine-form" onSubmit={submit} autoComplete="off">
        <input
          type="text"
          placeholder="@yourhandle"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          maxLength={64}
          required
        />
        <button type="submit" className="btn btn-gold">
          <span className="ttl">FIND MY MATCH →</span>
        </button>
      </form>

      {match && (
        <div className="machine-result" style={{ borderColor: match.civColor }}>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(match.id)}
              alt={match.name}
              width={220}
              height={220}
              style={{ width: 220, height: 220, objectFit: "cover", border: `1px solid ${match.civColor}` }}
            />
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.2em", color: "var(--ink-2)" }}>
                @{match.handle} →
              </div>
              <h3 style={{ marginTop: 4 }}>
                #{match.id.toString().padStart(4, "0")}
              </h3>
              <div style={{ marginTop: 4, fontSize: 18, color: "var(--ink)" }}>
                {match.name}
              </div>
              <div style={{ marginTop: 6, color: match.civColor, fontFamily: "var(--mono2)", letterSpacing: "0.2em", fontSize: 12 }}>
                {match.civName.toUpperCase()}
              </div>

              <div style={{ marginTop: 18, padding: "10px 14px", border: "1px solid var(--line)", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.2em", color: "var(--ink-2)" }}>
                  REASON
                </div>
                <div style={{ marginTop: 4, fontSize: 15 }}>
                  {match.reason}
                </div>
              </div>

              <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn btn-gold" href={intent} target="_blank" rel="noreferrer">
                  <span className="ttl">POST THIS MATCH →</span>
                </a>
                <a className="btn" href={ogUrl} target="_blank" rel="noreferrer">
                  <span className="ttl">VIEW CARD ↗</span>
                </a>
                <a className="btn" href={`/citizens/${match.id}`}>
                  <span className="ttl">VISIT CITIZEN →</span>
                </a>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
            <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.2em", color: "var(--ink-2)", marginBottom: 10 }}>
              NEXT SIGNAL
            </div>
            <a className="btn" href={`/civilizations/${match.civSlug}`} style={{ borderColor: match.civColor }}>
              <span className="ttl">EXPLORE {match.civName.toUpperCase()} →</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}

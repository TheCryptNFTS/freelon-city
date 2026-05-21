"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSecrets, SecretsState } from "@/lib/secrets-store";
import { CIVILIZATIONS } from "@/lib/constants";

const ALL_SLUGS = Object.keys(CIVILIZATIONS);

// Renders a small badge on the Carrier profile that tracks the user's
// progress visiting each of the 10 civilization pages. Goes gold when
// all 10 are visited.
export function AllDoctrinesBadge() {
  const [s, setS] = useState<SecretsState | null>(null);
  useEffect(() => { setS(loadSecrets()); }, []);

  if (!s) return null;
  const seen = s.civsSeen.filter((slug) => ALL_SLUGS.includes(slug));
  const complete = seen.length >= ALL_SLUGS.length;

  return (
    <div
      style={{
        marginTop: 18,
        padding: "16px 18px",
        border: `1px solid ${complete ? "#c8aa64" : "var(--line)"}`,
        background: complete ? "rgba(200,170,100,0.06)" : "rgba(255,255,255,0.015)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: complete ? "#c8aa64" : "var(--ink-2)" }}>
          ⬡ ALL DOCTRINES {complete ? "· UNLOCKED" : `· ${seen.length}/10`}
        </span>
        {!complete && (
          <Link href="/civilizations" style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-2)" }}>
            VISIT →
          </Link>
        )}
      </div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ALL_SLUGS.map((slug) => {
          const got = seen.includes(slug);
          const c = (CIVILIZATIONS as Record<string, { color: string; name: string }>)[slug];
          return (
            <span
              key={slug}
              title={c?.name}
              style={{
                width: 14,
                height: 14,
                display: "inline-block",
                background: got ? c?.color : "transparent",
                border: `1px solid ${got ? c?.color : "var(--line)"}`,
                opacity: got ? 1 : 0.5,
              }}
            />
          );
        })}
      </div>
      {complete && (
        <div style={{ marginTop: 10, fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-2)" }}>
          THE CITY READ YOU. ALL TEN CHANNELS · ACKNOWLEDGED.
        </div>
      )}
    </div>
  );
}

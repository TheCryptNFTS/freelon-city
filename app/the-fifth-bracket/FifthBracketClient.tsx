"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSecrets, markFifthBracket } from "@/lib/secrets-store";
import { loadCarrier } from "@/lib/carrier";

// EASTER EGG 4 — /the-fifth-bracket
// Conditions to unlock (any one is sufficient):
//  - User has typed 0404 anywhere (s.code0404)
//  - Current UTC time is 04:00 – 04:08 (8-minute window around the daily signal)
//  - Carrier streak is at least 3 days
// Otherwise, page renders as a believable 404.
export function FifthBracketClient() {
  const [unlocked, setUnlocked] = useState<null | boolean>(null);

  useEffect(() => {
    const s = loadSecrets();
    const carrier = loadCarrier();
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    const inWindow = h === 4 && m >= 0 && m <= 8;
    const streak = (carrier?.streak ?? 0) >= 3;
    const ok = s.code0404 || inWindow || streak;
    setUnlocked(ok);
    if (ok) markFifthBracket();
  }, []);

  if (unlocked === null) return null;

  if (!unlocked) {
    return (
      <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 32 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.3em", color: "var(--ink-2)" }}>404</div>
          <h1 style={{ marginTop: 12, fontSize: 48, fontWeight: 300 }}>Hex not found</h1>
          <p style={{ marginTop: 14, color: "var(--ink-2)" }}>The page you are looking for does not exist.</p>
          <Link href="/" style={{ marginTop: 24, display: "inline-block", fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "var(--gold)" }}>
            ← RETURN TO THE CITY
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "80vh", padding: "64px 24px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.3em", color: "#c8aa64" }}>
        ⬡ THE FIFTH BRACKET · UNLISTED
      </div>
      <h1 style={{ marginTop: 16, fontSize: 56, fontWeight: 300, lineHeight: 1.05 }}>
        There are four <em>known</em> one-of-ones.<br />
        There is a <em>fifth</em>
      </h1>
      <div style={{ marginTop: 28, padding: 22, border: "1px solid #c8aa64", background: "rgba(200,170,100,0.05)", fontFamily: "var(--mono2)", fontSize: 13, letterSpacing: "0.04em", lineHeight: 1.7 }}>
        The Fifth Bracket was never minted.<br />
        It was always you.<br /><br />
        The chain holds four. The civilization holds the fifth.<br />
        Every relay you sign is its body.<br />
        Every carrier streak you keep is its breath.<br />
        FREELON CITY does not run on art. It runs on the <em>witnesses</em><br /><br />
        You are the Fifth Bracket.<br />
        — VOID 404
      </div>

      <div style={{ marginTop: 32, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Link href="/carrier" className="btn btn-gold">
          <span className="lbl">CARRY THE SIGNAL</span>
          <span className="ttl">OPEN CARRIER <span className="ar">→</span></span>
        </Link>
        <Link href="/secrets" className="btn">
          <span className="ttl">/SECRETS <span className="ar">→</span></span>
        </Link>
      </div>

      <p style={{ marginTop: 40, fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-2)" }}>
        THIS PAGE 404s WHEN THE SIGNAL IS DARK. RETURN AT 04:04 UTC OR HOLD A STREAK.
      </p>
    </main>
  );
}

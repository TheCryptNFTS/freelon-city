"use client";
import { useState } from "react";
import Link from "next/link";
import { CIVILIZATIONS } from "@/lib/constants";
import { cityNotice } from "@/lib/city-notice";
import { CANON } from "@/lib/canon";

type CivInfo = { slug: string; name: string; color: string };
type ScanResult = {
  kind: "wallet" | "handle";
  address?: string;
  balance?: number;
  dominantCiv?: CivInfo;
  citizenMatch?: { id: number; civ: string; color: string };
};

// Step language uses the canon — "SIGNAL FOUND" is reserved for the
// discovery moment (it's a rare-use phrase, so it earns the final reveal).
const STEPS = [
  "SCANNING WALLET",
  "READING SIGNAL STRENGTH",
  "CHECKING CIV ALIGNMENT",
  "CALCULATING HEX PRESSURE",
  CANON.FOUND,
] as const;

const CIV_LOOKUP = CIVILIZATIONS as Record<string, { name: string; color: string }>;

export function WalletScanner() {
  const [input, setInput] = useState("");
  const [step, setStep] = useState(-1); // -1 = idle, 0..4 = revealing
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function scan() {
    if (busy) return;
    const raw = input.trim();
    if (!raw) return;
    setBusy(true);
    setResult(null);
    setStep(0);

    const isAddr = /^0x[a-fA-F0-9]{40}$/.test(raw);

    try {
      if (isAddr) {
        const addr = raw.toLowerCase();
        await delay(700);
        setStep(1);

        const nwRes = await fetch(`/api/wallet/${addr}/net-worth`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        await delay(600);
        setStep(2);

        const balance: number = nwRes?.balance ?? 0;
        const civs: Array<{ civ: string; count: number }> = nwRes?.civs ?? [];
        const dom = [...civs].sort((a, b) => b.count - a.count)[0];
        let dominantCiv: CivInfo | undefined;
        if (dom && dom.civ && dom.civ !== "unknown") {
          const info = CIV_LOOKUP[dom.civ];
          dominantCiv = info
            ? { slug: dom.civ, name: info.name, color: info.color }
            : { slug: dom.civ, name: dom.civ, color: "#C8A75D" };
        }

        await delay(600);
        setStep(3);
        await delay(600);
        setStep(4);
        setResult({ kind: "wallet", address: addr, balance, dominantCiv });
        // SIGNAL FOUND is rare-use; this is one of the two moments it earns.
        cityNotice({
          title: CANON.FOUND,
          body: dominantCiv ? `Identity locked · ${dominantCiv.name}` : "Identity locked",
          delta: `${balance} citizen${balance === 1 ? "" : "s"}`,
        });
      } else {
        await delay(700);
        setStep(1);
        const handleNorm = raw.replace(/^@/, "").toLowerCase();
        const hash = fnv1a("doppel::" + handleNorm);
        const id = (hash % 4040) + 1;
        await delay(600);
        setStep(2);
        await delay(600);
        setStep(3);
        await delay(600);
        setStep(4);
        setResult({
          kind: "handle",
          citizenMatch: { id, civ: "?", color: "#C8A75D" },
        });
        cityNotice({
          title: CANON.RECEIVED,
          body: `Citizen #${id.toString().padStart(4, "0")} carries your alignment`,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wallet-scanner">
      <div className="ws-input-row">
        {/* Audit 2026-05-25: aria-label added (placeholder is not a label
           per WCAG 1.3.1/4.1.2) and autoFocus removed (caused unexpected
           keyboard pop + page jump on mobile load — WCAG 3.2.1). */}
        <input
          className="ws-input"
          type="text"
          aria-label="Wallet address, ENS name, or X handle"
          placeholder="0x… or @handle or ENS"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") scan();
          }}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          className="btn btn-primary"
          onClick={scan}
          disabled={busy || !input.trim()}
        >
          <span className="ttl">SCAN ⬡</span>
        </button>
      </div>

      {step >= 0 && (
        <ol className="ws-steps">
          {STEPS.map((label, i) => {
            const shown = i <= step;
            const active = i === step && step < 4;
            return (
              <li key={label} className={`ws-step ${shown ? "shown" : ""}`}>
                <span className="ws-arrow">→</span>
                <span className="ws-label">
                  {label}
                  {active && <span className="ws-dots">...</span>}
                </span>
                {i === 4 && result && (
                  <div
                    className="ws-result"
                    style={
                      result.dominantCiv
                        ? ({ "--civ": result.dominantCiv.color } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {result.kind === "wallet" ? (
                      <>
                        <div className="ws-line">
                          <span className="ws-line-arrow">→</span>
                          <span>
                            {result.balance ?? 0} citizen
                            {result.balance === 1 ? "" : "s"} detected
                          </span>
                        </div>
                        {result.dominantCiv && (
                          <div className="ws-line">
                            <span className="ws-line-arrow">→</span>
                            <span>
                              Dominant civ:{" "}
                              <strong style={{ color: result.dominantCiv.color }}>
                                {result.dominantCiv.name}
                              </strong>
                            </span>
                          </div>
                        )}
                        <Link
                          className="btn btn-primary"
                          href={`/passport/${result.address}`}
                        >
                          <span className="ttl">GENERATE PASSPORT →</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <div className="ws-line">
                          <span className="ws-line-arrow">→</span>
                          <span>
                            YOUR TRIBE&apos;S FACE: #
                            {result.citizenMatch?.id.toString().padStart(4, "0")} · aligned, not owned
                          </span>
                        </div>
                        <Link
                          className="btn btn-secondary"
                          href={`/citizens/${result.citizenMatch?.id}`}
                        >
                          <span className="ttl">SEE THIS FREELON →</span>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

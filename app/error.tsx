"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // surface to console for diagnostics
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
      }}
    >
      <section
        style={{
          maxWidth: 880,
          width: "100%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        <h1
          style={{
            fontSize: "clamp(96px, 22vw, 240px)",
            lineHeight: 0.85,
            letterSpacing: "-0.04em",
            margin: 0,
            color: "var(--ink)",
            fontWeight: 700,
          }}
        >
          FAULT
        </h1>

        <div
          style={{
            color: "var(--gold-bright)",
            fontFamily: "var(--mono2)",
            fontSize: 14,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
          }}
        >
          ⬡ THE SIGNAL HAS FAULTED
        </div>

        <p
          style={{
            maxWidth: 520,
            fontSize: 18,
            lineHeight: 1.5,
            color: "var(--ink)",
            margin: 0,
            opacity: 0.85,
          }}
        >
          A transmission broke mid-flight. The hex grid is recalibrating.
        </p>

        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            <span className="lbl">RETRY</span>
            <span className="ttl">RETRY THE TRANSMISSION <span className="ar">→</span></span>
          </button>
        </div>
      </section>
    </div>
  );
}

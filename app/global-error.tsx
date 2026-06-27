"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary. Unlike app/error.tsx, this catches errors thrown in
 * the ROOT LAYOUT itself, so it REPLACES the layout — it must render its own
 * <html>/<body> and cannot rely on globals.css or CSS variables (the layout that
 * loads them is exactly what failed). All styles are therefore inlined with
 * literal brand values so the fallback is still on-brand when nothing else loads.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            background: "#0a0a0a",
            color: "#f5f0e6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <section
            style={{
              maxWidth: 880,
              width: "100%",
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
                fontWeight: 700,
              }}
            >
              FAULT
            </h1>
            <div
              style={{
                color: "#c8aa64",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 14,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
              }}
            >
              ⬡ THE SIGNAL HAS FAULTED
            </div>
            <p style={{ maxWidth: 520, fontSize: 18, lineHeight: 1.5, margin: 0, opacity: 0.85 }}>
              A transmission broke mid-flight. The hex grid is recalibrating.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: "#c8aa64",
                color: "#0a0a0a",
                border: "none",
                borderRadius: 10,
                padding: "14px 26px",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              Retry the transmission →
            </button>
          </section>
        </div>
      </body>
    </html>
  );
}

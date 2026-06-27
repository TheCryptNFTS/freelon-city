"use client";

import { useState } from "react";

/**
 * Copy-to-paste <iframe> for the Living PFP widget (/embed/[id]).
 *
 * The distribution play: every embed a holder pastes into their own page is a
 * node that carries the FREELON look + a link home. Lives on the share card so
 * the "post it" artifact and the growth loop sit together.
 */
export function EmbedSnippet({ tokenId, name }: { tokenId: number; name: string }) {
  const [copied, setCopied] = useState(false);
  const code = `<iframe src="https://www.freeloncity.com/embed/${tokenId}" width="400" height="400" loading="lazy" style="border:0;border-radius:14px;max-width:100%" title="${name} — a living FREELON"></iframe>`;

  function copy() {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <div
      style={{
        maxWidth: 560,
        margin: "var(--s-5) auto 0",
        textAlign: "left",
        padding: "var(--s-3)",
        border: "1px solid color-mix(in srgb, var(--gold) 28%, transparent)",
        background: "color-mix(in srgb, var(--gold) 5%, transparent)",
        borderRadius: 12,
      }}
    >
      <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--gold)" }}>
        ⬡ EMBED THE LIVING PORTRAIT
      </div>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.6, margin: "6px 0 10px" }}>
        Drop it into your own site or profile — it awakens and watches the cursor, right there on your page.
      </p>
      <code
        style={{
          display: "block",
          fontFamily: "var(--mono, monospace)",
          fontSize: 11,
          color: "var(--ink-2)",
          background: "rgba(0,0,0,0.3)",
          border: "1px solid var(--line-2)",
          borderRadius: 8,
          padding: "10px 12px",
          wordBreak: "break-all",
          lineHeight: 1.5,
        }}
      >
        {code}
      </code>
      <button className="btn btn-secondary btn-sm" onClick={copy} style={{ marginTop: 10, display: "inline-flex" }}>
        <span className="ttl">{copied ? "✓ COPIED EMBED CODE" : "COPY EMBED CODE"}</span>
      </button>
    </div>
  );
}

export default EmbedSnippet;

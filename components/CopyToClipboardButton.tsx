"use client";
import { useState } from "react";

export function CopyToClipboardButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      style={{
        padding: "10px 14px",
        border: "1px solid var(--line-2)",
        background: "rgba(255,255,255,0.03)",
        color: copied ? "#7AE08D" : "var(--ink-2)",
        borderRadius: 8,
        fontFamily: "var(--mono2)",
        fontSize: 11,
        letterSpacing: "0.18em",
        cursor: "pointer",
      }}
    >
      {copied ? "✓ COPIED" : "📋 COPY"}
    </button>
  );
}

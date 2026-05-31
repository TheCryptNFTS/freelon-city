"use client";

/**
 * <GlossaryTerm term="civilization">civilization</GlossaryTerm>
 *
 * Wraps a piece of body copy with a subtle dotted underline and shows the
 * term's one-line definition (from lib/glossary) on hover, keyboard focus,
 * or tap. Lets the city's jargon explain itself in place instead of
 * sending a newcomer off to /start — the core lever against the "too
 * complex" feedback.
 *
 * `term` selects the definition; the visible children carry whatever the
 * surrounding sentence needs (e.g. plural "citizens"). If the term has no
 * definition the children render as plain text, so it can never break copy.
 */
import { useId, useState } from "react";
import { defineTerm } from "@/lib/glossary";

export function GlossaryTerm({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  const def = defineTerm(term);
  const [open, setOpen] = useState(false);
  const id = useId();

  if (!def) return <>{children}</>;

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          font: "inherit",
          color: "inherit",
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "help",
          textDecoration: "underline dotted",
          textUnderlineOffset: "3px",
          textDecorationColor: "var(--gold)",
          textDecorationThickness: "1px",
        }}
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            width: "min(260px, 78vw)",
            padding: "10px 12px",
            background: "var(--bg-2, #11131a)",
            border: "1px solid var(--gold)",
            borderRadius: 8,
            boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
            fontFamily: "var(--mono2)",
            fontSize: 12,
            lineHeight: 1.55,
            letterSpacing: "0.01em",
            color: "var(--ink, #e9edf4)",
            textTransform: "none",
            textAlign: "left",
            fontStyle: "normal",
            fontWeight: 400,
            whiteSpace: "normal",
            pointerEvents: "none",
          }}
        >
          {def}
        </span>
      )}
    </span>
  );
}

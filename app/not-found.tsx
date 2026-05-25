import Link from "next/link";
import RandomCitizenButton from "@/components/RandomCitizenButton";

export default function NotFound() {
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
            fontSize: "clamp(120px, 28vw, 320px)",
            lineHeight: 0.85,
            letterSpacing: "-0.04em",
            margin: 0,
            color: "var(--ink)",
            fontWeight: 700,
          }}
        >
          404
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
          ⬡ HEX NOT FOUND
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
          This route has fallen out of signal range.
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
          <Link className="btn btn-primary" href="/">
            <span className="lbl">RETURN</span>
            <span className="ttl">RETURN TO THE CITY <span className="ar">→</span></span>
          </Link>
          <RandomCitizenButton />
        </div>

        <Link
          href="/the-fifth-bracket"
          style={{
            marginTop: 20,
            fontFamily: "var(--mono2)",
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--ink)",
            opacity: 0.55,
            textDecoration: "none",
          }}
        >
          ⬡ The Fifth Bracket opens at 04:04 UTC
        </Link>
      </section>
    </div>
  );
}

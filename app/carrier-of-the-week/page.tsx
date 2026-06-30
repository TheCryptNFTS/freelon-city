import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentCarrier } from "@/lib/carrier-of-week";
import { gridImageUrl, openseaUrl } from "@/lib/constants";
import { CarrierShare } from "./CarrierShare";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Carrier of the Week — FREELON CITY",
  description: "Each week the city crowns one FREELON on its public work record. Recognition only.",
  openGraph: { images: [{ url: "/api/og/carrier", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/api/og/carrier"] },
};

const GOLD = "#C8A75D";

export default async function CarrierOfTheWeekPage() {
  const carrier = await getCurrentCarrier().catch(() => null);
  const id4 = carrier ? String(carrier.tokenId).padStart(4, "0") : "";
  const displayName =
    carrier && carrier.name && !carrier.name.startsWith("FREELON CITY #")
      ? carrier.name
      : carrier
        ? `Citizen #${id4}`
        : "";

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-6)" }}>
      {/* ReferralBeacon mount removed T11 2026-06-11 — global in app/layout.tsx. */}
      <header style={{ textAlign: "center", marginBottom: "var(--s-5)" }}>
        <span className="kicker" style={{ color: GOLD }}>⬡ THE WEEKLY CROWN</span>
        <h1 style={{ margin: "8px 0 6px", letterSpacing: "-0.01em" }}>Carrier of the Week</h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", margin: 0 }}>
          Each ISO week the city crowns one FREELON, judged on its publicly recorded merit —
          level, skill and training history. Recognition only.
        </p>
      </header>

      {!carrier ? (
        <section
          style={{
            border: `1px solid ${GOLD}40`,
            borderRadius: 14,
            padding: "var(--s-5)",
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(200,167,93,0.06), rgba(0,0,0,0.3))",
          }}
        >
          <p style={{ fontFamily: "var(--mono2)", fontSize: 14, color: "var(--ink-2)", margin: 0 }}>
            No carrier crowned yet. The first crown is awarded once citizens have logged
            real recorded work.{" "}
            <Link href="/citizens" style={{ color: GOLD }}>Meet the citizens →</Link>
          </p>
        </section>
      ) : (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 340px) 1fr",
            gap: "var(--s-5)",
            alignItems: "center",
            border: `1px solid ${GOLD}55`,
            borderRadius: 16,
            padding: "var(--s-5)",
            background: `linear-gradient(135deg, rgba(200,167,93,0.08), rgba(0,0,0,0.35))`,
            boxShadow: `0 0 60px ${carrier.civColor}22`,
          }}
        >
          {/* Art in a gold laurel frame */}
          <div
            style={{
              borderRadius: 14,
              overflow: "hidden",
              border: `3px solid ${GOLD}`,
              aspectRatio: "1",
              boxShadow: `0 0 50px ${carrier.civColor}40`,
              background: "#05070f",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gridImageUrl(carrier.tokenId, 640)}
              alt={displayName}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>

          {/* Details */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px",
                border: `1px solid ${GOLD}`,
                borderRadius: 999,
                color: GOLD,
                fontFamily: "var(--mono2)",
                fontSize: 11,
                letterSpacing: "0.18em",
                marginBottom: 12,
              }}
            >
              ⬡ CROWNED · {carrier.weekKey}
            </div>

            <h2 style={{ margin: "0 0 4px", fontSize: 30, letterSpacing: "-0.01em" }}>{displayName}</h2>

            <div
              style={{
                fontFamily: "var(--mono2)",
                fontSize: 13,
                letterSpacing: "0.06em",
                color: carrier.civColor,
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              {carrier.civName} · #{id4}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <span style={pillStyle()}>LVL {carrier.level}</span>
              <span style={pillStyle()}>{carrier.className.toUpperCase()}</span>
              {carrier.tunedFor && <span style={pillStyle()}>TUNED · {carrier.tunedFor.toUpperCase()}</span>}
            </div>

            <p style={{ fontFamily: "var(--mono2)", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 16px" }}>
              The laurel is stamped permanently on this token&rsquo;s public memory log — a
              non-transferable mark of recognition that stays with the FREELON even after a sale.
              No cash value. Crowned on merit, never by chance.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <CarrierShare
                weekKey={carrier.weekKey}
                tokenId={carrier.tokenId}
                name={displayName}
                civName={carrier.civName}
                level={carrier.level}
                className={carrier.className}
              />
              <Link
                href={`/citizens/${carrier.tokenId}`}
                className="btn"
                style={{ textDecoration: "none" }}
              >
                <span className="ttl">VIEW CITIZEN ↗</span>
              </Link>
              <a
                href={openseaUrl(carrier.tokenId)}
                target="_blank"
                rel="noreferrer"
                className="btn"
                style={{ textDecoration: "none" }}
              >
                <span className="ttl">OPENSEA ↗</span>
              </a>
            </div>
          </div>
        </section>
      )}

      <section style={{ marginTop: "var(--s-5)" }}>
        <h3 style={{ fontSize: 14, letterSpacing: "0.14em", color: "var(--ink-dim)", fontFamily: "var(--mono2)", textTransform: "uppercase" }}>
          How the crown is judged
        </h3>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 680 }}>
          The Carrier of the Week is the FREELON sitting highest on the city&rsquo;s public
          merit leaderboard — level, specialized skill and training history. It is a contest of
          work, not luck. One FREELON is crowned per week. The only reward is recognition: a
          featured slot here and a permanent laurel on the token&rsquo;s memory log. It carries no
          cash value and is not transferable.
        </p>
      </section>

      <footer style={{ marginTop: "var(--s-5)", textAlign: "center" }}>
        <Link
          href="/legal/carrier-of-the-week-rules"
          style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.14em", color: "var(--ink-dim)" }}
        >
          OFFICIAL RULES →
        </Link>
      </footer>
    </main>
  );
}

function pillStyle(): React.CSSProperties {
  return {
    padding: "5px 12px",
    border: "1px solid var(--line)",
    borderRadius: 6,
    fontFamily: "var(--mono2)",
    fontSize: 11,
    letterSpacing: "0.1em",
    color: "var(--ink)",
  };
}

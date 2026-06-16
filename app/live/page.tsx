import Link from "next/link";
import type { Metadata } from "next";
import { listTransmissions, type TransmissionPublic } from "@/lib/transmissions-store";
import { listRecentTransforms, type TransformEntry } from "@/lib/transforms-feed";
import { topCitizens } from "@/lib/progression-store";
import { getCitizen } from "@/lib/citizens";
import { CityPulse } from "@/components/CityPulse";
import { TransmissionCard } from "@/components/TransmissionCard";
import { CitizenAvatar } from "@/components/CitizenAvatar";
import { PageBeacon } from "@/components/PageBeacon";

// Live aggregation — never cache; this page's whole job is to read as ALIVE.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "City Lives — happening now",
  description:
    "What's happening in FREELON CITY right now — who's climbing, what citizens just made, the latest transmissions. A living on-chain AI civilization.",
};

export default async function LivePage() {
  const [transmissions, transforms, leaders] = await Promise.all([
    listTransmissions({ by: "recent", limit: 6 }).catch(() => [] as TransmissionPublic[]),
    listRecentTransforms(12).catch(() => [] as TransformEntry[]),
    topCitizens("level", 8).catch(() => [] as { tokenId: number; value: number }[]),
  ]);

  const leaderRows = leaders
    .map((r) => ({ ...r, citizen: getCitizen(r.tokenId) }))
    .filter((r): r is typeof r & { citizen: NonNullable<typeof r.citizen> } => !!r.citizen);

  const madeRows = transforms
    .map((t) => ({ ...t, citizen: getCitizen(t.tokenId) }))
    .filter((t): t is typeof t & { citizen: NonNullable<typeof t.citizen> } => !!t.citizen)
    .slice(0, 8);

  return (
    <div className="home-page" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--pad)" }}>
      <PageBeacon name="live_view" />

      {/* HERO — the "is this alive?" answer, up front. */}
      <section style={{ paddingTop: "var(--s-8)", textAlign: "center" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ HAPPENING NOW</span>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", lineHeight: 1.02, margin: "var(--s-3) 0 var(--s-2)" }}>
          THE CITY IS <span style={{ color: "var(--gold)" }}>ALIVE</span>.
        </h1>
        <p style={{ color: "var(--ink-2)", maxWidth: 640, margin: "0 auto var(--s-4)" }}>
          A living on-chain AI civilization since 2023. Citizens climb, make, and broadcast every day —
          here&apos;s the city right now.
        </p>
        <CityPulse />
      </section>

      {/* CLIMBING — the leaderboard (who's winning). */}
      {leaderRows.length > 0 && (
        <section style={{ marginTop: "var(--s-8)" }}>
          <span className="kicker">⬡ CLIMBING · TOP CITIZENS</span>
          <ol style={{ listStyle: "none", padding: 0, margin: "var(--s-3) 0 0", display: "grid", gap: 8 }}>
            {leaderRows.map((r, i) => (
              <li key={r.tokenId}>
                <Link
                  href={`/citizens/${r.tokenId}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "10px 14px",
                    borderRadius: 14, border: "1px solid var(--line)", background: "rgba(255,255,255,0.02)",
                    textDecoration: "none", color: "var(--ink)",
                  }}
                >
                  <span style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--gold)", width: 24 }}>
                    {(i + 1).toString().padStart(2, "0")}
                  </span>
                  <CitizenAvatar tokenId={r.tokenId} size={46} alt={r.citizen.name} />
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.citizen.name}
                  </span>
                  <span style={{ fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.12em", color: "var(--ink-2)" }}>
                    LV {r.value}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* MADE — what citizens just generated. */}
      {madeRows.length > 0 && (
        <section style={{ marginTop: "var(--s-8)" }}>
          <span className="kicker">⬡ JUST MADE · BY CITIZENS</span>
          <div className="ui-auto-fit-cards" style={{ ["--min-w" as string]: "150px", marginTop: "var(--s-3)" }}>
            {madeRows.map((m) => (
              <Link key={m.url} href={`/citizens/${m.tokenId}`} style={{ textDecoration: "none", color: "var(--ink-2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={`${m.style} by ${m.citizen.name}`} loading="lazy"
                  style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 12, border: "1px solid var(--line)" }} />
                <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.1em", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.citizen.name} · {m.style.toUpperCase()}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* LATELY — recent transmissions (what citizens are broadcasting). */}
      {transmissions.length > 0 && (
        <section style={{ marginTop: "var(--s-8)" }}>
          <span className="kicker">⬡ LATELY · TRANSMISSIONS</span>
          <div className="ui-auto-fit-cards" style={{ ["--min-w" as string]: "260px", marginTop: "var(--s-3)" }}>
            {transmissions.map((t) => (
              <TransmissionCard key={t.id} t={t} compact />
            ))}
          </div>
          <div style={{ marginTop: "var(--s-3)" }}>
            <Link className="kicker" href="/transmissions" style={{ color: "var(--ink-dim)" }}>
              SEE ALL TRANSMISSIONS →
            </Link>
          </div>
        </section>
      )}

      {/* CTA — turn the aliveness into a try. */}
      <section style={{ margin: "var(--s-8) 0", textAlign: "center" }}>
        <span className="kicker">⬡ JOIN THE CITY</span>
        <div className="ui-cta-row" style={{ marginTop: "var(--s-2)", justifyContent: "center" }}>
          <Link className="btn btn-primary btn-lg" href="/demo">
            <span className="ttl">MEET A CITIZEN · FREE →</span>
          </Link>
          <Link className="btn btn-secondary btn-lg" href="/citizens">
            <span className="ttl">BROWSE THE 4,040 →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

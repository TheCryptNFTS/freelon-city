/**
 * /press — assets for studios, ingestors, journalists, and partners.
 *
 * Everything needed to write about FREELON CITY without asking the
 * architect for files. Logos, banner, OG card examples, voice notes,
 * contact route.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { CONTRACT, TOTAL } from "@/lib/constants";

// Force-dynamic — same webpack chunking quirk we hit on /channel.
// Server components with image-heavy nested helpers triggered a
// prerender TypeError. Rendering on demand sidesteps the static
// generation path entirely.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Press Kit · FREELON CITY",
  description:
    "Logos, banner, OG cards, brand voice, contact. Everything needed to write about the city.",
};

export default function PressPage() {
  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      <section style={{ marginBottom: "var(--s-5)" }}>
        <span className="kicker">⬡ PRESS KIT</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(44px, 7vw, 80px)", lineHeight: 0.94, letterSpacing: "-0.02em", margin: "10px 0 14px" }}>
          Everything to write the story.
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 640 }}>
          Free to use for editorial coverage, ingestion, and partnership
          discussions. For commercial reuse, DM <a href="https://x.com/4040hex" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>@4040hex</a> first.
        </p>
      </section>

      {/* ── ONE-LINERS ── */}
      <Section title="One-liners">
        <Quote>
          FREELON CITY is a 4040-citizen on-chain civilization on Ethereum where
          carriers earn hex by moving, not waiting.
        </Quote>
        <Quote>
          The city pays carriers in hex for active work — sweeps, snipes, sales,
          daily posts — and refuses to recognize citizens listed under floor.
        </Quote>
        <Quote>
          A signal civilization on Ethereum. 4040 hard-capped citizens. Hex
          economy. Dump-deterrent canon. The city remembers everything.
        </Quote>
      </Section>

      {/* ── LOGO + BANNER ── */}
      <Section title="Logos & banner">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--s-3)" }}>
          <Asset
            label="Logo · square 1024"
            href="/social/pfp-1024.png"
            preview="/social/pfp-1024.png"
            size="square"
          />
          <Asset
            label="Banner · 1500 × 500"
            href="/social/banner-1500x500.jpg"
            preview="/social/banner-1500x500.jpg"
            size="banner"
          />
          <Asset
            label="Favicon · 96"
            href="/favicon.png"
            preview="/favicon.png"
            size="square"
          />
        </div>
      </Section>

      {/* ── OG CARDS ── */}
      <Section title="OG cards · every URL has one">
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: "var(--s-3)", maxWidth: 640 }}>
          Auto-generated 1200×630 cards for every citizen, civilization, dashboard,
          and wallet. Just append the path. Examples:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--s-3)" }}>
          <OgExample label="Citizen #0001"   path="/api/og/1" />
          <OgExample label="Daily signal"    path="/api/og/daily" />
          <OgExample label="Hex index"       path="/api/og/hex-index" />
          <OgExample label="Heat board"      path="/api/og/heat" />
        </div>
      </Section>

      {/* ── BRAND VOICE ── */}
      <Section title="Brand voice (so you write it right)">
        <Rule
          n="01"
          title="Lead with ⬡ — always."
          body="Every post, every share, every brand mention. The hex glyph is the brand. Replace bullets, divider dashes, and headers with ⬡ wherever it fits."
        />
        <Rule
          n="02"
          title="@4040hex is preceded by ⬡, always."
          body="The architect's account is the city's voice. Never mention it bare — wrap it: ⬡ @4040hex."
        />
        <Rule
          n="03"
          title="Hashtags: #FREELONCITY #404HEXNOTFOUND."
          body="Two tags, both uppercase, both at the end. Together they cluster into a searchable thread."
        />
        <Rule
          n="04"
          title="Don't lead with a URL or an @-mention."
          body="X demotes link-led posts and treats @-led posts as replies. Lead with a glyph, a noun, or a sentence — never a URL or a handle."
        />
        <Rule
          n="05"
          title="Voice is canon: imperative, terse, mythic."
          body={`Examples that work: "The city remembers." "Active beats passive." "Hex moves through carriers." Examples that don't: "Don't forget to claim today!" "Check out our latest update!"`}
        />
      </Section>

      {/* ── CONTRACT FACTS ── */}
      <Section title="Verifiable facts">
        <div
          style={{
            padding: "var(--s-4)",
            border: "1px solid var(--line)",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 12,
            display: "grid",
            gap: 10,
            fontFamily: "var(--mono2)",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.7,
          }}
        >
          <Fact label="NAME"        value="FREELON CITY" />
          <Fact label="SUPPLY"      value={`${TOTAL.toLocaleString()} citizens · hard-capped · no mint left`} />
          <Fact label="STANDARD"    value="ERC-721 · Ethereum mainnet" />
          <Fact label="CONTRACT"    value={<code style={{ fontSize: 12, color: "var(--ink)" }}>{CONTRACT}</code>} />
          <Fact label="MARKETPLACE" value={<a href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>opensea.io/collection/freelons ↗</a>} />
          <Fact label="LIVE STATS"  value={<Link href="/numbers" style={{ color: "var(--gold)" }}>/numbers</Link>} />
          <Fact label="VOICE"       value={<a href="https://x.com/4040hex" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>@4040hex on X</a>} />
        </div>
      </Section>

      {/* ── CONTACT ── */}
      <Section title="Contact">
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
          DM <a href="https://x.com/4040hex" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>@4040hex</a> on X for press, partnerships, or
          permission to reuse assets commercially.
        </p>
      </Section>

      <section style={{ marginTop: "var(--s-7)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT</span>
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: "var(--s-2)" }}>
          <Link className="btn btn-primary" href="/numbers"><span className="ttl">PULSE →</span></Link>
          <Link className="btn btn-secondary" href="/architect"><span className="ttl">THE ARCHITECT →</span></Link>
          <Link className="btn btn-secondary" href="/roadmap"><span className="ttl">THE ROADMAP →</span></Link>
        </div>
      </section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "var(--s-5)" }}>
      <span className="kicker">⬡ {title.toUpperCase()}</span>
      <div style={{ marginTop: "var(--s-3)" }}>{children}</div>
    </section>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote
      style={{
        margin: "0 0 12px 0",
        padding: "var(--s-3) var(--s-4)",
        borderLeft: "3px solid var(--gold)",
        background: "rgba(200,167,93,0.05)",
        fontFamily: "var(--mono2)",
        fontSize: 13,
        color: "var(--ink)",
        lineHeight: 1.65,
      }}
    >
      {children}
    </blockquote>
  );
}

function Asset({ label, href, preview, size }: { label: string; href: string; preview: string; size: "square" | "banner" }) {
  return (
    <article style={{ padding: "var(--s-3)", border: "1px solid var(--line)", borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: size === "square" ? "1/1" : "3/1", overflow: "hidden", borderRadius: 8, background: "#000", marginBottom: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt={label} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <a
        href={href}
        download
        style={{
          display: "inline-block",
          padding: "6px 12px",
          fontFamily: "var(--mono2)",
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "var(--gold)",
          border: "1px solid var(--gold)",
          borderRadius: 999,
          textDecoration: "none",
          textTransform: "uppercase",
        }}
      >
        download →
      </a>
    </article>
  );
}

function OgExample({ label, path }: { label: string; path: string }) {
  return (
    <article style={{ padding: "var(--s-3)", border: "1px solid var(--line)", borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1200/630", overflow: "hidden", borderRadius: 8, background: "#000", marginBottom: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={path} alt={label} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <code style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-2)" }}>{path}</code>
    </article>
  );
}

function Rule({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <article style={{ padding: "var(--s-3) var(--s-4)", border: "1px solid var(--line)", background: "rgba(255,255,255,0.02)", borderRadius: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.28em", color: "var(--gold)" }}>{n}</span>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 18, margin: 0, letterSpacing: "-0.005em" }}>{title}</h3>
      </div>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.65, margin: "8px 0 0" }}>{body}</p>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, letterSpacing: "0.26em", color: "var(--ink-dim)", textTransform: "uppercase", minWidth: 110 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

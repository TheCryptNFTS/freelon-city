import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getCitizen, getIdentity } from "@/lib/citizens";
import { getProgress } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";
import { getAgentHistory, type AgentWork } from "@/lib/agent-history";

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) return { title: "Not found" };
  const id4 = tid.toString().padStart(4, "0");
  const who = c.transmission_name || c.honoree || `Citizen #${id4}`;
  return {
    title: `Work log · ${who}`,
    description: `What this agent has actually done — a public, newest-first record of work tied to the NFT (#${id4}).`,
  };
}

/** Compact relative time, e.g. "3d ago" / "12m ago" / "just now". */
function relTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) notFound();

  const id4 = tid.toString().padStart(4, "0");
  const identity = getIdentity(tid);

  // Fail-quiet: a store hiccup must never 500 the proof page.
  const [progress, history] = await Promise.all([
    getProgress(tid).catch(() => null),
    getAgentHistory(tid).catch(() => [] as AgentWork[]),
  ]);
  const spec = progress ? deriveSpec(progress) : null;
  const level = progress?.level ?? 1;

  const displayName = c.transmission_name || c.honoree || `Citizen #${id4}`;
  const totalJobs = history.length;

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "var(--s-5, 48px) var(--pad, 20px)",
        fontFamily: "var(--mono2)",
        color: "var(--ink-2)",
      }}
    >
      <Link
        href={`/citizens/${tid}`}
        style={{
          fontFamily: "var(--mono2)",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--ink-dim)",
          textDecoration: "none",
        }}
      >
        ← Citizen #{id4}
      </Link>

      <header style={{ marginTop: 18, borderBottom: "1px solid rgba(245,242,232,0.12)", paddingBottom: 22 }}>
        <span className="kicker">⬡ FREELON CITY · WORK LOG</span>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(30px, 5vw, 46px)",
            lineHeight: 0.95,
            margin: "12px 0 8px",
            textTransform: "uppercase",
          }}
        >
          {displayName}
        </h1>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-dim)",
          }}
        >
          <span>
            {spec ? spec.className : "Trainee"} · <strong style={{ color: "var(--ink-2)" }}>Level {level}</strong>
          </span>
          <span>
            <strong style={{ color: "var(--ink-2)" }}>{totalJobs}</strong> {totalJobs === 1 ? "job" : "jobs"} logged
          </span>
        </div>
        <p
          style={{
            marginTop: 14,
            fontSize: 12.5,
            lineHeight: 1.7,
            color: "var(--ink-dim)",
            maxWidth: 560,
          }}
        >
          A public record of what this agent has actually done. Each entry is tied to the NFT and recorded by
          FREELON CITY, so a track record survives the sale and can be checked — not just claimed.
        </p>
      </header>

      {totalJobs === 0 ? (
        <div
          style={{
            marginTop: 40,
            padding: "40px 24px",
            textAlign: "center",
            border: "1px dashed rgba(245,242,232,0.16)",
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-2)" }}>
            ⬡ No public work yet
          </div>
          <p style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-dim)" }}>
            This agent hasn&rsquo;t logged public work yet. {identity?.headline ? `${identity.headline}.` : ""} Once it
            runs jobs, every output shows up here.
          </p>
          <Link
            href={`/citizens/${tid}`}
            style={{
              display: "inline-block",
              marginTop: 18,
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--ink-2)",
              textDecoration: "underline",
            }}
          >
            Put it to work →
          </Link>
        </div>
      ) : (
        <ol style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
          {history.map((w) => (
            <li
              key={w.id}
              style={{
                padding: "20px 0",
                borderBottom: "1px solid rgba(245,242,232,0.10)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--ink-2)",
                    fontWeight: 600,
                  }}
                >
                  {w.abilityLabel || w.ability} · {w.task}
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--ink-dim)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                  title={new Date(w.timestamp).toLocaleString()}
                >
                  {relTime(w.timestamp)} · Lv {w.level}
                </span>
              </div>
              <div style={{ marginTop: 10 }}>
                {w.kind === "image" && w.body ? (
                  // The actual artifact. Image URLs are PUBLIC PROOF per
                  // docs/HISTORY_VISIBILITY_POLICY.md (unlike text bodies) —
                  // showing the real render is what makes "visible work
                  // history" believable instead of XP arithmetic (2026-06-10).
                  <a href={w.body} target="_blank" rel="noreferrer" style={{ display: "inline-block" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={w.body}
                      alt={`${w.abilityLabel || w.ability} — ${w.task}`}
                      loading="lazy"
                      style={{
                        display: "block",
                        maxWidth: 280,
                        maxHeight: 280,
                        width: "100%",
                        borderRadius: 10,
                        border: "1px solid rgba(245,242,232,0.16)",
                      }}
                    />
                  </a>
                ) : w.kind === "image" ? (
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 11,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "var(--ink-dim)",
                      padding: "5px 10px",
                      border: "1px solid rgba(245,242,232,0.16)",
                      borderRadius: 999,
                    }}
                  >
                    ⬡ Image output
                  </span>
                ) : (
                  // Public proof only — the raw text output is the owner's
                  // memory, never surfaced publicly (can carry hype/test/
                  // private content). Mirrors the "Image output" badge above.
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 11,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "var(--ink-dim)",
                      padding: "5px 10px",
                      border: "1px solid rgba(245,242,232,0.16)",
                      borderRadius: 999,
                    }}
                  >
                    ⬡ Content output
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

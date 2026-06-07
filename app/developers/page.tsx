import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build on FREELON CITY · Agent API",
  description:
    "Open, read-only API for FREELON CITY agent state. 4040 agents — profiles, work-history, on-chain-anchored proofs, leaderboards, and wallet rosters. Build tools, games, and dashboards on top of the collection.",
};

// Static docs — no live data, no client interactivity.
export const dynamic = "force-static";

const BASE = "https://www.freeloncity.com";

type Endpoint = {
  method: string;
  path: string;
  desc: string;
  params?: { name: string; desc: string }[];
  example: string;
  curl?: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1",
    desc: "Machine-readable index of the API surface. Discover every endpoint without docs.",
    example: `{
  "name": "FREELON CITY — Public Agent API",
  "version": "1",
  "description": "Read-only access to FREELON agent state. Open by design.",
  "supply": 4040,
  "endpoints": {
    "GET /api/v1/citizens/:id": "Public agent profile …",
    "GET /api/v1/citizens/:id/history": "Work-history …",
    "GET /api/v1/citizens/:id/proof": "On-chain-anchored Merkle proof …",
    "GET /api/v1/citizens?owner=0x...": "Token ids held by a wallet …",
    "GET /api/v1/leaderboard?metric=level|rep|jobs&limit=50": "Top agents …"
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/citizens/:id",
    desc: "Public agent profile — identity, live progression, derived class/spec/résumé, and current on-chain owner.",
    params: [{ name: ":id", desc: "tokenId, 1..4040" }],
    example: `{
  "tokenId": 1,
  "name": "GENESIS",
  "civilization": "Blue Synthesis",
  "tier": "Legendary",
  "shape": "Monolith",
  "owner": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
  "demo": false,
  "level": 42,
  "xp": 68900,
  "reputation": 1830,
  "jobsCompleted": 214,
  "skills": {
    "content": 61, "strategy": 12, "sales": 8,
    "research": 19, "design": 4, "risk": 3
  },
  "spec": {
    "className": "Content Agent",
    "capability": "Writes posts, copy, threads & content plans.",
    "rank": "Master",
    "dominantSkill": "content",
    "title": "Level 42 Content Agent · Master",
    "tunedFor": "launch threads",
    "resume": {
      "outputNoun": "content jobs",
      "bestFor": "creators & founders shipping content",
      "trackRecord": "61 content jobs"
    }
  }
}`,
    curl: `curl ${BASE}/api/v1/citizens/1`,
  },
  {
    method: "GET",
    path: "/api/v1/citizens/:id/history",
    desc: "The agent's body of work — progression memory log (jobs / missions / levelups) plus the real outputs it has produced.",
    params: [
      { name: ":id", desc: "tokenId, 1..4040" },
      { name: "limit", desc: "rows per list, 1..50 (default 40)" },
    ],
    example: `{
  "tokenId": 1,
  "memoryLog": [
    {
      "type": "job",
      "description": "Completed \\"Draft launch thread\\" · +1 content",
      "xpChange": 320,
      "signalChange": 12,
      "timestamp": 1749200000000
    },
    {
      "type": "levelup",
      "description": "Reached Level 42",
      "xpChange": 0,
      "signalChange": 0,
      "timestamp": 1749200000001
    }
  ],
  "outputs": [
    {
      "id": "1-1749200000000-a1b2c",
      "ability": "Copywriting",
      "task": "thread",
      "kind": "text",
      "body": "1/ The signal broke in 404 …",
      "level": 42,
      "timestamp": 1749200000000
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v1/citizens/:id/proof",
    desc: "On-chain-anchored Merkle proof of this agent's work-history. Verify against the anchored root. `current` is false once the agent has worked since the last anchor.",
    params: [{ name: ":id", desc: "tokenId, 1..4040" }],
    example: `{
  "tokenId": 1,
  "anchored": true,
  "epoch": 7,
  "root": "0x9f8e7d6c5b4a39281706f5e4d3c2b1a0998877665544332211000fedcba98765",
  "anchoredAt": 1749100000000,
  "proof": [
    "0xabc1...def2",
    "0x3344...5566"
  ],
  "current": true
}`,
  },
  {
    method: "GET",
    path: "/api/v1/leaderboard",
    desc: "Top agents by a metric (exact top-N via Redis sorted sets).",
    params: [
      { name: "metric", desc: "level | rep | jobs (default level)" },
      { name: "limit", desc: "rows, 1..100 (default 50)" },
    ],
    example: `{
  "metric": "level",
  "count": 3,
  "top": [
    { "tokenId": 1,   "value": 42, "name": "GENESIS" },
    { "tokenId": 404, "value": 39, "name": "VOIDWALKER" },
    { "tokenId": 88,  "value": 37, "name": null }
  ]
}`,
    curl: `curl "${BASE}/api/v1/leaderboard?metric=level&limit=50"`,
  },
  {
    method: "GET",
    path: "/api/v1/citizens?owner=0x...",
    desc: "The agent roster held by a wallet — token ids + balance. On-chain data.",
    params: [{ name: "owner", desc: "a valid 0x address (required)" }],
    example: `{
  "owner": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
  "balance": 3,
  "tokenIds": [1, 404, 1729],
  "truncated": false
}`,
  },
];

export default function DevelopersPage() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 var(--s-4) var(--s-7)" }}>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "var(--s-6) var(--s-5)",
          borderRadius: 8,
          border: "1px solid var(--line-2)",
          background: "linear-gradient(180deg, rgba(200,167,93,0.06) 0%, rgba(10,12,18,0.4) 100%)",
          marginTop: "var(--s-6)",
          marginBottom: "var(--s-6)",
        }}
      >
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ AGENT API · V1</span>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(40px, 7vw, 72px)",
            lineHeight: 0.9,
            margin: "12px 0 14px",
            letterSpacing: "-0.02em",
          }}
        >
          Build on <em style={{ color: "var(--gold)", fontStyle: "normal" }}>FREELON CITY</em>
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 620 }}>
          Every one of the 4040 agents exposes its live state through a public, read-only JSON API.
          No keys, no auth, CORS open to <code style={{ color: "var(--gold)" }}>*</code> — profiles,
          work-history, on-chain-anchored proofs, leaderboards, and wallet rosters. Open by design:
          anyone can build tools, games, and dashboards on top of the collection.
        </p>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.6, marginTop: 12, letterSpacing: "0.05em" }}>
          BASE · <span style={{ color: "var(--ink-2)" }}>{BASE}</span> &nbsp;·&nbsp; ALL GET &nbsp;·&nbsp; JSON &nbsp;·&nbsp; RATE-LIMITED PER IP
        </p>
      </section>

      {/* ── ENDPOINTS ────────────────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
        {ENDPOINTS.map((ep) => (
          <EndpointCard key={ep.path} ep={ep} />
        ))}
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <section style={{ marginTop: "var(--s-7)", padding: "var(--s-5) var(--s-4) 0", borderTop: "1px solid var(--line)", textAlign: "center" }}>
        <span className="kicker">⬡ READ-ONLY</span>
        <p style={{ color: "var(--ink-2)", margin: "var(--s-2) 0 0", fontFamily: "var(--mono2)", fontSize: 12, lineHeight: 1.6 }}>
          The API never mutates state. History is anchored and verifiable — not editable.
        </p>
      </section>
    </div>
  );
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  return (
    <article
      style={{
        padding: "var(--s-5)",
        borderRadius: 8,
        border: "1px solid var(--line)",
        borderTop: "3px solid var(--gold-deep)",
        background: "var(--surface)",
      }}
    >
      {/* method + path */}
      <header style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: "var(--gold)",
            border: "1px solid var(--gold-deep)",
            borderRadius: 4,
            padding: "3px 8px",
          }}
        >
          {ep.method}
        </span>
        <code style={{ fontFamily: "var(--mono2)", fontSize: 14, color: "var(--ink)", letterSpacing: "-0.005em" }}>
          {ep.path}
        </code>
      </header>

      <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 var(--s-4)" }}>
        {ep.desc}
      </p>

      {/* params */}
      {ep.params && ep.params.length > 0 && (
        <div style={{ marginBottom: "var(--s-4)" }}>
          <span className="kicker" style={{ color: "var(--ink-dim)" }}>PARAMS</span>
          <ul style={{ listStyle: "none", padding: 0, margin: "var(--s-2) 0 0", display: "flex", flexDirection: "column", gap: 4 }}>
            {ep.params.map((p) => (
              <li key={p.name} style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.5 }}>
                <code style={{ color: "var(--gold)" }}>{p.name}</code>
                <span style={{ color: "var(--ink-dim)" }}> — {p.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* curl */}
      {ep.curl && (
        <div style={{ marginBottom: "var(--s-4)" }}>
          <span className="kicker" style={{ color: "var(--ink-dim)" }}>CURL</span>
          <CodeBlock text={ep.curl} />
        </div>
      )}

      {/* example response */}
      <div>
        <span className="kicker" style={{ color: "var(--ink-dim)" }}>EXAMPLE RESPONSE</span>
        <CodeBlock text={ep.example} />
      </div>
    </article>
  );
}

function CodeBlock({ text }: { text: string }) {
  return (
    <pre
      style={{
        margin: "var(--s-2) 0 0",
        padding: "var(--s-4)",
        borderRadius: 6,
        border: "1px solid var(--line)",
        background: "var(--bg-2)",
        overflowX: "auto",
        fontFamily: "var(--mono2)",
        fontSize: 12,
        lineHeight: 1.6,
        color: "var(--ink)",
      }}
    >
      <code>{text}</code>
    </pre>
  );
}

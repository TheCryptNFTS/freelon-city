// ── GAME PREVIEW ────────────────────────────────────────────────────
// The /play cards were title + blurb on a flat panel — top game sites
// show what each mode looks like. These are asset-free SVG posters, one
// per game, each mirroring the actual mechanic (a hex board, a relit
// skyline, Wordle rows, a sweep grid, civ-war bars, scattered cipher
// fragments) in the game's accent colour. Faithful, fast, no 404s.
//
// Decorative only — aria-hidden; the card title carries the real label.

import type { CSSProperties } from "react";

export type GameKind =
  | "hex-match"
  | "restore"
  | "proof"
  | "sweep"
  | "reckoning"
  | "cipher"
  | "guard"
  | "mars";

// The six signal-civilization gem colours, mirrored from HexMatch.tsx.
const GEMS = ["#00B8FF", "#FF3A2D", "#4CFF7A", "#B85CFF", "#FF5CB4", "#FFD24A"];

const HEX = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

const wrap: CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  aspectRatio: "320 / 150",
};

function Hex({
  x,
  y,
  s,
  fill,
  dim,
}: {
  x: number;
  y: number;
  s: number;
  fill: string;
  dim?: boolean;
}) {
  const pts = [
    [x + s / 2, y],
    [x + s, y + s * 0.25],
    [x + s, y + s * 0.75],
    [x + s / 2, y + s],
    [x, y + s * 0.75],
    [x, y + s * 0.25],
  ]
    .map((p) => p.join(","))
    .join(" ");
  return (
    <polygon
      points={pts}
      fill={fill}
      opacity={dim ? 0.18 : 1}
      style={dim ? undefined : { filter: `drop-shadow(0 0 4px ${fill})` }}
    />
  );
}

export function GamePreview({
  kind,
  accent,
}: {
  kind: GameKind;
  accent: string;
}) {
  const common = {
    viewBox: "0 0 320 150",
    style: wrap,
    role: "img",
    "aria-hidden": true,
    preserveAspectRatio: "xMidYMid slice",
  } as const;

  if (kind === "mars") {
    // A dust-red Mars horizon with the gold signal spire + rover — the actual scene.
    return (
      <svg {...common}>
        <defs>
          <linearGradient id="mars-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0f0a" />
            <stop offset="60%" stopColor="#3a1f14" />
            <stop offset="100%" stopColor="#7a3a20" />
          </linearGradient>
          <radialGradient id="mars-spire" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0c0e15" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="150" fill="url(#mars-sky)" />
        {[40, 70, 110, 160, 210, 250, 290].map((x, i) => (
          <circle key={i} cx={x} cy={14 + (i % 3) * 9} r={0.9} fill="#f2ead8" opacity={0.7} />
        ))}
        {/* ground */}
        <path d="M0 96 Q160 80 320 100 L320 150 L0 150 Z" fill="#a8552f" />
        <path d="M0 110 Q160 98 320 116 L320 150 L0 150 Z" fill="#8a3f22" opacity="0.7" />
        <rect x="120" y="34" width="80" height="80" fill="url(#mars-spire)" />
        {/* signal spire */}
        <polygon points="156,40 164,40 172,104 148,104" fill="#1a130d" />
        {[56, 72, 88].map((y, i) => (
          <rect key={i} x={150 - i} y={y} width={20 + i * 2} height={3.5} rx={1} fill="#f0c75e">
            <animate attributeName="opacity" values="0.6;1;0.6" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
          </rect>
        ))}
        <polygon points="160,30 166,38 154,38" fill="#f0c75e" />
        {/* rover silhouette */}
        <g transform="translate(232 104)" fill="#d8cabf">
          <rect x="0" y="0" width="22" height="9" rx="2" />
          <circle cx="5" cy="11" r="3" fill="#0c0e15" />
          <circle cx="17" cy="11" r="3" fill="#0c0e15" />
        </g>
        {/* corruption shard (dust-red, the enemy) */}
        <polygon points="60,108 66,86 72,108" fill="#a8341f" opacity="0.85" />
      </svg>
    );
  }

  if (kind === "hex-match") {
    // A 6×3 board of glowing hex gems — what the player actually swaps.
    const cols = 7;
    const rows = 3;
    const s = 38;
    const gap = 6;
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = (r * cols + c) % GEMS.length;
        const x = 8 + c * (s + gap) + (r % 2) * ((s + gap) / 2);
        const y = 12 + r * (s * 0.8 + gap);
        cells.push(
          <Hex key={`${r}-${c}`} x={x} y={y} s={s} fill={GEMS[idx]} />,
        );
      }
    }
    return (
      <svg {...common}>
        <rect width="320" height="150" fill="#0c0e15" />
        {cells}
      </svg>
    );
  }

  if (kind === "restore") {
    // A dark skyline relighting — the idle "bring the city back online" loop.
    const bars = Array.from({ length: 18 }, (_, i) => {
      const h = 30 + ((i * 37) % 80);
      const lit = i % 3 !== 2;
      return (
        <g key={i}>
          <rect
            x={8 + i * 17}
            y={150 - h}
            width={12}
            height={h}
            fill={lit ? accent : "#1b2030"}
            opacity={lit ? 0.9 : 1}
          />
          {lit && (
            <rect
              x={8 + i * 17}
              y={150 - h}
              width={12}
              height={4}
              fill="#fff"
              opacity={0.7}
            />
          )}
        </g>
      );
    });
    return (
      <svg {...common}>
        <defs>
          <radialGradient id="rg-glow" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0c0e15" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="150" fill="#0c0e15" />
        <rect width="320" height="150" fill="url(#rg-glow)" />
        {bars}
      </svg>
    );
  }

  if (kind === "proof") {
    // Wordle-style rows: each guess a row of dots, lit ones = a hit.
    const rows = 4;
    const cols = 5;
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const state = (r * 7 + c * 3) % 4;
        const fill =
          state === 0 ? accent : state === 1 ? "#4CFF7A" : "#1b2030";
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={60 + c * 42}
            y={14 + r * 32}
            width={32}
            height={24}
            rx={4}
            fill={fill}
            style={
              fill !== "#1b2030"
                ? { filter: `drop-shadow(0 0 4px ${fill})` }
                : undefined
            }
          />,
        );
      }
    }
    return (
      <svg {...common}>
        <rect width="320" height="150" fill="#0c0e15" />
        {cells}
      </svg>
    );
  }

  if (kind === "sweep") {
    // A grid mid-corruption: dead cells (red) spreading, living ones (cyan).
    const n = 8;
    const m = 4;
    const cells = [];
    for (let r = 0; r < m; r++) {
      for (let c = 0; c < n; c++) {
        const corrupt = (r * 5 + c * 3) % 4 === 0;
        const fill = corrupt ? "#FF3A2D" : accent;
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={8 + c * 38}
            y={10 + r * 34}
            width={30}
            height={26}
            rx={3}
            fill={fill}
            opacity={corrupt ? 0.85 : 0.55}
            style={{ filter: `drop-shadow(0 0 3px ${fill})` }}
          />,
        );
      }
    }
    return (
      <svg {...common}>
        <rect width="320" height="150" fill="#0c0e15" />
        {cells}
      </svg>
    );
  }

  if (kind === "reckoning") {
    // King-of-the-hill: ten civ columns competing, a crown hex on the leader.
    const civ = [
      "#00B8FF",
      "#FF3A2D",
      "#4CFF7A",
      "#B85CFF",
      "#FF5CB4",
      "#FFD24A",
      "#E9C984",
      "#9aa3b2",
      "#ffffff",
      "#7a8194",
    ];
    const heights = [40, 62, 30, 90, 50, 120, 70, 44, 56, 34];
    const leader = heights.indexOf(Math.max(...heights));
    return (
      <svg {...common}>
        <rect width="320" height="150" fill="#0c0e15" />
        {heights.map((h, i) => (
          <rect
            key={i}
            x={10 + i * 30}
            y={150 - h}
            width={20}
            height={h}
            fill={civ[i]}
            opacity={i === leader ? 1 : 0.5}
            style={
              i === leader
                ? { filter: `drop-shadow(0 0 6px ${civ[i]})` }
                : undefined
            }
          />
        ))}
        {/* crown hex over the leader */}
        <g
          style={{
            transform: `translate(${10 + leader * 30 + 2}px, ${150 - heights[leader] - 22}px)`,
          }}
        >
          <polygon
            points="8,0 16,4 16,12 8,16 0,12 0,4"
            fill="#FFD24A"
            style={{ filter: "drop-shadow(0 0 6px #FFD24A)" }}
          />
        </g>
      </svg>
    );
  }

  if (kind === "guard") {
    // A sealed vault: a big hex "door" with a keyhole and a glowing ⬡ prize,
    // escalating fee bars climbing on the right — the adversarial pot.
    const bars = [22, 34, 48, 66, 90];
    return (
      <svg {...common}>
        <defs>
          <radialGradient id="gv-glow" cx="38%" cy="50%" r="60%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0c0e15" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="150" fill="#0c0e15" />
        <rect width="320" height="150" fill="url(#gv-glow)" />
        {/* vault door */}
        <polygon
          points="120,18 175,40 175,110 120,132 65,110 65,40"
          fill="#161a24"
          stroke={accent}
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
        />
        {/* keyhole */}
        <circle cx="120" cy="68" r="11" fill={accent} opacity="0.9" />
        <rect x="116" y="74" width="8" height="20" fill={accent} opacity="0.9" />
        <text x="120" y="74" fontSize="13" fill="#0c0e15" textAnchor="middle" dominantBaseline="middle">⬡</text>
        {/* escalating fee bars */}
        {bars.map((h, i) => (
          <rect
            key={i}
            x={210 + i * 20}
            y={120 - h}
            width={13}
            height={h}
            rx={2}
            fill={accent}
            opacity={0.4 + i * 0.12}
            style={{ filter: `drop-shadow(0 0 3px ${accent})` }}
          />
        ))}
      </svg>
    );
  }

  // cipher — five scattered glyph fragments of a lost transmission.
  const glyphs = ["⬡", "◇", "▲", "✦", "●"];
  const spots = [
    [40, 50],
    [120, 30],
    [180, 90],
    [250, 45],
    [90, 110],
  ];
  return (
    <svg {...common}>
      <defs>
        <radialGradient id="cy-glow" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0c0e15" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="150" fill="#0c0e15" />
      <rect width="320" height="150" fill="url(#cy-glow)" />
      {/* faint connecting lines — fragments of one message */}
      <polyline
        points={spots.map((s) => s.join(",")).join(" ")}
        fill="none"
        stroke={accent}
        strokeWidth="1"
        strokeDasharray="3 5"
        opacity="0.5"
      />
      {spots.map(([x, y], i) => (
        <text
          key={i}
          x={x}
          y={y}
          fontSize="30"
          fill={accent}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ filter: `drop-shadow(0 0 5px ${accent})` }}
        >
          {glyphs[i]}
        </text>
      ))}
    </svg>
  );
}

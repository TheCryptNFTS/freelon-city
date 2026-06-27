"use client";

/**
 * Honeycomb — the visible memory substrate for the /remember demo.
 *
 * It draws the belief ledger as a hex constellation: a center YOU cell wired to
 * one cell per thing the citizen remembers. When a recall is being explained
 * ("why?"), the exact cell + its wire light gold — that lit path is the REAL
 * evidence trail read from the engine, not decoration.
 *
 * A DERIVED cell (a fact you never stated, composed by walking the ledger) is
 * drawn in periwinkle, hung off the belief it was walked THROUGH rather than off
 * center. Lighting it lights the whole chain — center → through → derived — the
 * actual path the engine took. When memory is ablated, every cell goes dark and
 * empty: the picture of a mind with nothing in it.
 */

export type Cell = {
  id: string;
  label: string; // attribute, e.g. "LOVES"
  value: string; // remembered value, e.g. "late-night jazz"
  x: number; // 0..1 layout space
  y: number;
  derived?: boolean; // composed, never stated — drawn in periwinkle
  through?: string; // id of the base cell this derived fact was walked through
};

const HEX_R = 52;
const VIOLET = "#9AA0E6";
const VIOLET_BRIGHT = "#C5C8FF";

// Pointy-top hexagon points for a cell centered at (cx, cy).
function hexPoints(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function Honeycomb({
  centerLabel,
  cells,
  litId,
  memoryOn,
  width = 640,
  height = 420,
}: {
  centerLabel: string;
  cells: Cell[];
  litId: string | null;
  memoryOn: boolean;
  width?: number;
  height?: number;
}) {
  const cx = width / 2;
  const cy = height / 2;

  const base = cells.filter((c) => !c.derived);
  const derivedCells = cells.filter((c) => c.derived);

  // Base beliefs ring around the YOU center.
  const placedBase = base.map((c, i) => {
    const angle = (Math.PI * 2 * i) / Math.max(1, base.length) - Math.PI / 2;
    const radius = Math.min(width, height) * 0.3;
    return { ...c, px: cx + radius * Math.cos(angle), py: cy + radius * Math.sin(angle) };
  });

  // Derived beliefs hang OUTWARD from the base cell they were walked through —
  // visually saying "this was reached past that one", not stored at center.
  const placedDerived = derivedCells.map((c) => {
    const anchor = placedBase.find((p) => p.id === c.through);
    const ax = anchor?.px ?? cx;
    const ay = anchor?.py ?? cy;
    const dx = ax - cx;
    const dy = ay - cy;
    const len = Math.hypot(dx, dy) || 1;
    const extra = HEX_R * 1.95;
    return { ...c, px: ax + (dx / len) * extra, py: ay + (dy / len) * extra, ax, ay };
  });

  // Which base cell is on the lit derived chain (so its wire/cell light violet).
  const litDerived = placedDerived.find((c) => memoryOn && litId === c.id);
  const litThroughId = litDerived?.through ?? null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ maxWidth: width, display: "block", margin: "0 auto", userSelect: "none" }}
      role="img"
      aria-label="HexMind memory map"
    >
      <defs>
        <radialGradient id="hm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E9C984" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#E9C984" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hm-glow-v" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={VIOLET_BRIGHT} stopOpacity="0.5" />
          <stop offset="100%" stopColor={VIOLET_BRIGHT} stopOpacity="0" />
        </radialGradient>
        <filter id="hm-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {/* wires from center to each base cell */}
      {placedBase.map((c) => {
        const lit = memoryOn && litId === c.id;
        const onChain = memoryOn && litThroughId === c.id;
        const stroke = lit ? "#E9C984" : onChain ? VIOLET : "rgba(245,242,232,0.10)";
        return (
          <line
            key={`w-${c.id}`}
            x1={cx}
            y1={cy}
            x2={c.px}
            y2={c.py}
            stroke={stroke}
            strokeWidth={lit || onChain ? 2.4 : 1}
            strokeDasharray={lit || onChain ? "none" : "3 5"}
          />
        );
      })}

      {/* wires from the through-cell out to each derived cell */}
      {placedDerived.map((c) => {
        const lit = memoryOn && litId === c.id;
        return (
          <line
            key={`wd-${c.id}`}
            x1={c.ax}
            y1={c.ay}
            x2={c.px}
            y2={c.py}
            stroke={lit ? VIOLET_BRIGHT : `color-mix(in srgb, ${VIOLET} 35%, transparent)`}
            strokeWidth={lit ? 2.4 : 1.2}
            strokeDasharray={lit ? "2 4" : "2 6"}
          />
        );
      })}

      {/* base cells */}
      {placedBase.map((c) => {
        const lit = memoryOn && litId === c.id;
        const onChain = memoryOn && litThroughId === c.id;
        const filled = memoryOn; // ablated = empty husks
        const accent = lit ? "#E9C984" : onChain ? VIOLET : null;
        return (
          <g key={c.id}>
            {lit && <circle cx={c.px} cy={c.py} r={HEX_R * 1.5} fill="url(#hm-glow)" filter="url(#hm-soft)" />}
            {onChain && !lit && <circle cx={c.px} cy={c.py} r={HEX_R * 1.4} fill="url(#hm-glow-v)" filter="url(#hm-soft)" />}
            <polygon
              points={hexPoints(c.px, c.py, HEX_R)}
              fill={accent ? `color-mix(in srgb, ${accent} 13%, transparent)` : filled ? "rgba(245,242,232,0.03)" : "transparent"}
              stroke={accent ?? (filled ? "rgba(245,242,232,0.22)" : "rgba(245,242,232,0.10)")}
              strokeWidth={accent ? 2 : 1}
            />
            <text
              x={c.px}
              y={c.py - 8}
              textAnchor="middle"
              fontFamily="var(--mono2), monospace"
              fontSize="9"
              letterSpacing="0.18em"
              fill={accent ?? "rgba(245,242,232,0.55)"}
            >
              {c.label}
            </text>
            <text
              x={c.px}
              y={c.py + 10}
              textAnchor="middle"
              fontFamily="var(--mono2), monospace"
              fontSize="11"
              fill={filled ? (accent ? "#F5F2E8" : "rgba(245,242,232,0.82)") : "rgba(245,242,232,0.18)"}
            >
              {filled ? truncate(c.value, 16) : "—"}
            </text>
          </g>
        );
      })}

      {/* derived cells — periwinkle, composed not stored */}
      {placedDerived.map((c) => {
        const lit = memoryOn && litId === c.id;
        const filled = memoryOn;
        return (
          <g key={c.id}>
            {lit && <circle cx={c.px} cy={c.py} r={HEX_R * 1.5} fill="url(#hm-glow-v)" filter="url(#hm-soft)" />}
            <polygon
              points={hexPoints(c.px, c.py, HEX_R)}
              fill={lit ? `color-mix(in srgb, ${VIOLET} 16%, transparent)` : filled ? `color-mix(in srgb, ${VIOLET} 5%, transparent)` : "transparent"}
              stroke={lit ? VIOLET_BRIGHT : filled ? `color-mix(in srgb, ${VIOLET} 50%, transparent)` : "rgba(245,242,232,0.10)"}
              strokeWidth={lit ? 2 : 1.2}
              strokeDasharray="4 4"
            />
            <text
              x={c.px}
              y={c.py - 8}
              textAnchor="middle"
              fontFamily="var(--mono2), monospace"
              fontSize="9"
              letterSpacing="0.16em"
              fill={lit ? VIOLET_BRIGHT : filled ? VIOLET : "rgba(245,242,232,0.18)"}
            >
              {c.label}
            </text>
            <text
              x={c.px}
              y={c.py + 10}
              textAnchor="middle"
              fontFamily="var(--mono2), monospace"
              fontSize="11"
              fill={filled ? (lit ? "#F5F2E8" : `color-mix(in srgb, ${VIOLET} 85%, white)`) : "rgba(245,242,232,0.18)"}
            >
              {filled ? truncate(c.value, 16) : "—"}
            </text>
          </g>
        );
      })}

      {/* center YOU cell */}
      <g>
        <polygon
          points={hexPoints(cx, cy, HEX_R + 6)}
          fill={memoryOn ? "rgba(200,167,93,0.10)" : "rgba(245,242,232,0.02)"}
          stroke={memoryOn ? "#C8A75D" : "rgba(245,242,232,0.14)"}
          strokeWidth="2"
        />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontFamily="var(--mono2), monospace"
          fontSize="9"
          letterSpacing="0.22em"
          fill={memoryOn ? "#C8A75D" : "rgba(245,242,232,0.3)"}
        >
          YOU
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontFamily="var(--display), sans-serif"
          fontSize="15"
          fill={memoryOn ? "#F5F2E8" : "rgba(245,242,232,0.22)"}
        >
          {memoryOn ? truncate(centerLabel, 14) : "?"}
        </text>
      </g>
    </svg>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

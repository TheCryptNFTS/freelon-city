import { ImageResponse } from "next/og";

export const runtime = "edge";

// Shareable OG card — the real front door (every X/Discord/OpenSea link
// preview). This is the FIRST thing a stranger sees, so it has to read as a
// premium collectible brand in 10 seconds, not a feature list.
//
// 2026-06-09 brand pass (founder: "seriously up our branding"):
//   - Killed the off-brand CYAN (#00B8FF) + NAVY (#0A0E27) on the scope card —
//     the whole system is now the LOCKED palette: gold on warm near-black.
//   - The wordmark is set in CLASH DISPLAY (the site's display face), vendored
//     same-origin at /public/fonts and loaded into the edge render — no more
//     generic system-ui (the #1 "demo template" tell on a card people screenshot).
//   - Composition: hex-glyph logotype lockup, a masthead hairline, a portrait
//     vignette that points the eye at the glowing hex face, a two-weight foil
//     seam, and a mono provenance stamp.
//
// DEFAULT (homepage / shares) = the product card: ONE large FREELON portrait +
// the plain-words pitch. The six-collection SCOPE card is gated at `?v=universe`.
//
// Art + font are mirrored locally under /public (same-origin) so the edge render
// stays fast + reliable and never depends on a remote CDN fetch.

const BG = "#0B0B0D";
const SURFACE = "#141417";
const INK = "#F5F2E8";
const INK_FADE = "rgba(245,242,232,0.42)";
const LINE_2 = "rgba(245,242,232,0.16)";
const GOLD = "#C8A75D";
const GOLD_BRIGHT = "#E9C984";
const GOLD_DEEP = "#8A7A40";

const PIECES: { name: string; tag: string; color: string; img: string }[] = [
  { name: "Freelons", tag: "4040 CITIZENS", color: GOLD, img: "/og/art/freelons.png" },
  { name: "The Crypt", tag: "DEAD SIGNALS", color: "#4CFF7A", img: "/og/art/crypt.png" },
  { name: "Crypt TCG", tag: "TEN GODS", color: "#FF6A3D", img: "/og/art/combat.png" },
  { name: "OOGIES", tag: "ANCIENT SPECIES", color: "#B85CFF", img: "/og/art/oogies.png" },
  { name: "Emile", tag: "MEMORY", color: "#FF5CB4", img: "/og/art/emile.png" },
  { name: "SMILES", tag: "COLLAPSE", color: "#FFD24A", img: "/og/art/smiles.png" },
];

// Per-surface card copy (upgrade audit #11/#14, 2026-06-19). Six surfaces used to
// share the identical homepage card (the ?b=2 param was a no-op the route never
// read), so the preview never matched the destination. Same proven 1200×630
// composition — only the kicker + subline change per `?surface=`. /proof reuses
// this too (was a 1024² square tagged summary_large_image → force-cropped to a strip).
type CardCopy = { kicker: string; subline: string };
const SURFACE_COPY: Record<string, CardCopy> = {
  default: { kicker: "AN AI CHARACTER YOU OWN", subline: "Own it. Train it. It remembers your work — and its history travels with the NFT." },
  demo: { kicker: "TRY A CITIZEN — FREE", subline: "Talk to a living AI citizen right now. No wallet needed. Then own one." },
  citizens: { kicker: "4,040 AI CITIZENS", subline: "Every face is a living AI agent with its own mind, memory and history. Meet yours." },
  collections: { kicker: "SIX SIGNAL COLLECTIONS", subline: "One city, six collections — every NFT a living AI citizen you can awaken." },
  proof: { kicker: "THE RENDER MOAT", subline: "Same prompt — only your FREELON renders your character. Here's the proof." },
};

// ── DEFAULT: product-first FREELON card ──────────────────────────────────
function FreelonCard(src: (p: string) => string, display: string, copy: CardCopy) {
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "row",
        background: BG,
        color: INK,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* faint gold glow, top-right (was off-brand cyan elsewhere) */}
      <div
        style={{
          position: "absolute",
          top: -220,
          right: -180,
          width: 620,
          height: 620,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(233,201,132,0.16) 0%, rgba(233,201,132,0) 70%)",
          display: "flex",
        }}
      />

      {/* LEFT — one large cinematic FREELON hero (the 1/1 "THE FINAL SIGNAL"
          rendered into a black-sun eclipse — generated via the proven
          identity-lock pipeline, hex face intact). objectPosition top so the
          eclipse + glowing hex eye survive the portrait crop. */}
      <div style={{ width: 560, height: "630px", display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src("/og/art/hero-eclipse.png")}
          width="560"
          height="630"
          alt=""
          style={{ width: "560px", height: "630px", objectFit: "cover", objectPosition: "center 38%" }}
        />
        {/* vignette — darkens corners so the glowing hex face is the brightest
            point and the eye lands there at thumbnail size */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 38% 42%, rgba(11,11,13,0) 52%, rgba(11,11,13,0.62) 100%)",
            display: "flex",
          }}
        />
        {/* gentle fade into the panel so the seam reads intentional */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 170,
            height: "630px",
            background: "linear-gradient(90deg, rgba(11,11,13,0) 0%, rgba(11,11,13,0.94) 100%)",
            display: "flex",
          }}
        />
      </div>

      {/* two-weight FOIL seam — a thin bright gold line + a heavier gold-deep
          line, so the divide reads printed/foil-stamped, not a CSS border */}
      <div style={{ position: "absolute", left: 560, top: 0, width: 1, height: "630px", background: GOLD, display: "flex" }} />
      <div style={{ position: "absolute", left: 566, top: 0, width: 2, height: "630px", background: GOLD_DEEP, display: "flex" }} />

      {/* RIGHT — kicker · wordmark lockup · subline */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 64px",
          gap: 20,
          position: "relative",
        }}
      >
        {/* masthead: kicker + a hairline rule under it = a label becomes a masthead */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 23,
              fontWeight: 700,
              letterSpacing: "0.24em",
              color: GOLD_BRIGHT,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {copy.kicker}
          </div>
          <div style={{ width: 92, height: 1, background: GOLD, display: "flex" }} />
        </div>

        {/* wordmark lockup: the real brand hex mark as a hanging initial +
            FREELONS in Clash Display. (A literal ⬡ glyph tofu's in satori — no
            font carries it — so we use the actual logo PNG, same-origin.) Sized
            to fit the right panel (≈512px usable) without clipping. */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src("/logo.png")}
            width="74"
            height="74"
            alt=""
            style={{ width: "74px", height: "74px", display: "flex" }}
          />
          <div
            style={{
              fontFamily: display,
              fontSize: 86,
              fontWeight: 700,
              lineHeight: 0.86,
              letterSpacing: "-0.035em",
              color: INK,
              display: "flex",
            }}
          >
            FREELONS
          </div>
        </div>

        <div
          style={{
            fontSize: 31,
            lineHeight: 1.32,
            color: GOLD,
            letterSpacing: "0.01em",
            display: "flex",
            maxWidth: 510,
          }}
        >
          {copy.subline}
        </div>

        {/* provenance stamp — bottom-anchored mono, collector feel */}
        <div
          style={{
            position: "absolute",
            left: 64,
            bottom: 44,
            fontSize: 16,
            letterSpacing: "0.18em",
            color: INK_FADE,
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          FREELON CITY · 4040 · ETHEREUM
        </div>
      </div>
    </div>
  );
}

// ── VARIANT (?v=universe): the six-collection scope/contact-sheet card ────
function UniverseCard(src: (p: string) => string, display: string) {
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BG,
        color: INK,
        fontFamily: "system-ui, sans-serif",
        padding: "54px 56px",
        position: "relative",
      }}
    >
      {/* faint gold glow top-right (was off-brand cyan) */}
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -160,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(233,201,132,0.16) 0%, rgba(233,201,132,0) 70%)",
          display: "flex",
        }}
      />

      {/* headline block */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.26em",
              color: GOLD_BRIGHT,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            One universe · six collections · one arcade
          </div>
          <div style={{ width: 92, height: 1, background: GOLD, display: "flex" }} />
        </div>
        <div
          style={{
            fontFamily: display,
            fontSize: 100,
            fontWeight: 700,
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
            color: INK,
            display: "flex",
          }}
        >
          FREELON CITY
        </div>
        <div style={{ fontSize: 28, color: GOLD, letterSpacing: "0.02em", display: "flex" }}>
          When the HEX vanished, a city formed around the signal.
        </div>
      </div>

      {/* the pieces — a REAL art tile per connected collection */}
      <div style={{ display: "flex", gap: 12 }}>
        {PIECES.map((p) => (
          <div
            key={p.name}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              height: 250,
              borderRadius: 10,
              overflow: "hidden",
              border: `1px solid ${LINE_2}`,
              background: SURFACE,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src(p.img)}
              width="180"
              height="168"
              alt=""
              style={{ width: "100%", height: "168px", objectFit: "cover" }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                padding: "12px 12px 14px",
                borderTop: `3px solid ${p.color}`,
                flex: 1,
              }}
            >
              <span style={{ fontSize: 17, fontWeight: 700, color: INK, lineHeight: 1.0, display: "flex" }}>
                {p.name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.10em",
                  color: p.color,
                  textTransform: "uppercase",
                  display: "flex",
                }}
              >
                {p.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function GET(req: Request) {
  const src = (p: string) => new URL(p, req.url).toString();
  const params = new URL(req.url).searchParams;
  const variant = params.get("v");
  const copy = SURFACE_COPY[params.get("surface") ?? "default"] ?? SURFACE_COPY.default;

  // Load the site display face (Clash Display) same-origin so the wordmark is
  // on-brand, not system-ui. Fail-soft: if the fetch hiccups, fall back to the
  // sans stack (the card still renders, just less premium) rather than 500.
  let fonts: { name: string; data: ArrayBuffer; weight: 700; style: "normal" }[] | undefined;
  let display = "system-ui, sans-serif";
  try {
    const fontData = await fetch(src("/fonts/ClashDisplay-Bold.ttf")).then((r) => r.arrayBuffer());
    fonts = [{ name: "Clash Display", data: fontData, weight: 700, style: "normal" }];
    display = "Clash Display";
  } catch {
    /* fall back to system-ui */
  }

  return new ImageResponse(
    variant === "universe" ? UniverseCard(src, display) : FreelonCard(src, display, copy),
    {
      width: 1200,
      height: 630,
      ...(fonts ? { fonts } : {}),
      headers: {
        // Static composition — cache hard so social platforms hit the CDN
        // cache instead of re-rendering (re-renders are what make cards
        // silently fall back to a placeholder).
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}

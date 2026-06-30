"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useHolder } from "@/lib/useHolder";

// ── canvas geometry ─────────────────────────────────────────────────
// Render at 2x for retina-crisp output. The visible canvas is sized via
// CSS to 512–640px; the actual bitmap is 2048 so social-export looks
// sharp at any size.
const SIZE = 2048;
const PAD = 64; // outer breathing room so the drop-shadow doesn't clip

// Canon civ palette — duplicated here because canvas can't read CSS vars.
const CIVS: Record<string, { name: string; color: string }> = {
  "blue-synthesis":  { name: "Blue Synthesis",  color: "#4D8DFF" },
  "red-corruption":  { name: "Red Corruption",  color: "#FF4D4D" },
  "green-growth":    { name: "Green Growth",    color: "#5AC07E" },
  "purple-oracle":   { name: "Purple Oracle",   color: "#8D5CFF" },
  "pink-luxury":     { name: "Pink Luxury",     color: "#F26AC2" },
  "gold-sovereignty":{ name: "Gold Sovereignty", color: "#C8A75D" },
  "white-transmission": { name: "White Transmission", color: "#F5F2E8" },
  "black-fracture":  { name: "Black Fracture",  color: "#7A7A82" },
  "void-404":        { name: "Void 404",        color: "#9B7BE8" },
  "machine-doctrine":{ name: "Machine Doctrine", color: "#A8D0FF" },
};

const GOLD_STOPS = ["#F5E6B8", "#E9C984", "#C8A75D", "#8A7A40", "#5A4E26"];
const VOID_STOPS = ["#B59CFF", "#8D5CFF", "#5C3FB8", "#2F1F66"];

type FrameStyle = "gold" | "civ" | "platinum" | "void" | "minimal";
const HOLDER_ONLY: ReadonlyArray<FrameStyle> = ["gold", "civ", "void"];

export function PfpStudio() {
  const [src, setSrc] = useState<string | null>(null);
  const [frame, setFrame] = useState<FrameStyle>("platinum");
  const [civSlug, setCivSlug] = useState<string>("gold-sovereignty");
  const [zoom, setZoom] = useState(1.0);
  const [handle, setHandle] = useState("");
  const [showSignature, setShowSignature] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const holder = useHolder();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => setSrc(fr.result as string);
    fr.readAsDataURL(f);
  }

  useEffect(() => {
    if (!src) { draw(); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => { draw(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [frame, civSlug, zoom, handle, showSignature]);

  function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    // Flat-top hexagon (pointy-top would be cy ± r*sin(0))
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  /** Build a multi-stop diagonal gradient — the metal-cast trick. */
  function metalGradient(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, stops: string[]) {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    return g;
  }

  function frameStops(): { main: string[]; accent: string } {
    if (frame === "gold") return { main: GOLD_STOPS, accent: "#E9C984" };
    if (frame === "void") return { main: VOID_STOPS, accent: "#B59CFF" };
    if (frame === "platinum") return { main: ["#F5F2E8", "#D8D2BE", "#A8A28E", "#6E6856"], accent: "#F5F2E8" };
    if (frame === "minimal") return { main: ["#222", "#0a0a0c"], accent: "#444" };
    // civ
    const c = CIVS[civSlug] ?? CIVS["gold-sovereignty"];
    return { main: [lighten(c.color, 0.35), c.color, c.color, darken(c.color, 0.40)], accent: lighten(c.color, 0.15) };
  }

  function draw() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // ── Background — deep void with a soft radial vignette ────────
    const bg = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.2, SIZE / 2, SIZE / 2, SIZE * 0.75);
    bg.addColorStop(0, "#101015");
    bg.addColorStop(1, "#050507");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    // Inner hex radius (where the photo sits). Outer frame extends past this.
    const rInner = (SIZE - PAD * 2) * 0.46;
    const rFrame = rInner + 26; // outside edge of the main frame stroke

    const { main, accent } = frameStops();
    const metal = metalGradient(ctx, cx, cy, rFrame, main);

    // ── Outer dropshadow under the hex for separation ─────────────
    ctx.save();
    hexPath(ctx, cx, cy + 18, rFrame + 8);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.filter = "blur(28px)";
    ctx.fill();
    ctx.restore();

    // ── Photo clipped to the inner hex ────────────────────────────
    ctx.save();
    hexPath(ctx, cx, cy, rInner);
    ctx.clip();

    const img = imgRef.current;
    if (img) {
      const ratio = Math.max(SIZE / img.width, SIZE / img.height) * zoom;
      const w = img.width * ratio;
      const h = img.height * ratio;
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    } else {
      // Empty state — looks intentional, not "upload an image"
      const empty = ctx.createLinearGradient(0, 0, SIZE, SIZE);
      empty.addColorStop(0, "#1a1a22");
      empty.addColorStop(1, "#0a0a0e");
      ctx.fillStyle = empty;
      ctx.fillRect(cx - rInner, cy - rInner, rInner * 2, rInner * 2);
      ctx.fillStyle = "rgba(245,242,232,0.18)";
      ctx.font = `700 ${Math.round(rInner * 0.20)}px 'Satoshi', 'Helvetica Neue', system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⬡", cx, cy);
    }
    ctx.restore();

    // ── Subtle inner darkening at the edge of the photo (vignette) ──
    if (img) {
      ctx.save();
      hexPath(ctx, cx, cy, rInner);
      ctx.clip();
      const ivig = ctx.createRadialGradient(cx, cy, rInner * 0.5, cx, cy, rInner * 1.05);
      ivig.addColorStop(0, "rgba(0,0,0,0)");
      ivig.addColorStop(1, "rgba(0,0,0,0.40)");
      ctx.fillStyle = ivig;
      ctx.fillRect(cx - rInner, cy - rInner, rInner * 2, rInner * 2);
      ctx.restore();
    }

    // ── Main frame stroke — multi-stop metal gradient ─────────────
    const frameWidth = 48; // 48px on 2048 canvas = 24px CSS — substantial
    ctx.save();
    ctx.lineWidth = frameWidth;
    ctx.lineJoin = "miter";
    ctx.miterLimit = 6;
    hexPath(ctx, cx, cy, rInner + frameWidth / 2);
    ctx.strokeStyle = metal;
    ctx.stroke();

    // Inner bevel — darker line just inside the stroke for depth
    ctx.lineWidth = 4;
    hexPath(ctx, cx, cy, rInner);
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.stroke();

    // Outer specular highlight — thin bright line on the OUTSIDE
    ctx.lineWidth = 3;
    hexPath(ctx, cx, cy, rInner + frameWidth + 1);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.stroke();
    ctx.restore();

    // ── Rolex-style specular sweep across the metal ───────────────
    if (frame !== "minimal") {
      ctx.save();
      hexPath(ctx, cx, cy, rInner + frameWidth);
      ctx.clip();
      // mask out the photo region
      ctx.globalCompositeOperation = "source-atop";
      const glint = ctx.createLinearGradient(cx - rFrame, cy - rFrame, cx + rFrame, cy + rFrame);
      glint.addColorStop(0.00, "rgba(255,255,255,0)");
      glint.addColorStop(0.42, "rgba(255,255,255,0)");
      glint.addColorStop(0.50, "rgba(255,255,255,0.30)");
      glint.addColorStop(0.58, "rgba(255,255,255,0)");
      glint.addColorStop(1.00, "rgba(255,255,255,0)");
      ctx.fillStyle = glint;
      ctx.fillRect(cx - rFrame, cy - rFrame, rFrame * 2, rFrame * 2);
      // re-clip out the interior so the glint only shows on the frame itself
      ctx.globalCompositeOperation = "destination-out";
      hexPath(ctx, cx, cy, rInner - 4);
      ctx.fill();
      ctx.restore();
    }

    // ── Outer "coin edge" — 12 dots positioned around the perimeter ─
    if (frame === "gold" || frame === "platinum" || frame === "civ") {
      const dotR = 6;
      const dotDist = rInner + frameWidth + 36;
      ctx.fillStyle = accent;
      for (let i = 0; i < 12; i++) {
        const a = ((Math.PI * 2) / 12) * i - Math.PI / 2;
        const x = cx + dotDist * Math.cos(a);
        const y = cy + dotDist * Math.sin(a);
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Signature stamp — small, off to one side, not a wide bar ─
    if (showSignature) {
      const stampX = SIZE - PAD - 60;
      const stampY = SIZE - PAD - 60;
      ctx.save();
      ctx.translate(stampX, stampY);

      // Background pill
      const pillW = 460;
      const pillH = 96;
      const pillR = 48;
      ctx.beginPath();
      ctx.moveTo(-pillW + pillR, -pillH);
      ctx.lineTo(-pillR, -pillH);
      ctx.arcTo(0, -pillH, 0, -pillH + pillR, pillR);
      ctx.lineTo(0, -pillR);
      ctx.arcTo(0, 0, -pillR, 0, pillR);
      ctx.lineTo(-pillW + pillR, 0);
      ctx.arcTo(-pillW, 0, -pillW, -pillR, pillR);
      ctx.lineTo(-pillW, -pillH + pillR);
      ctx.arcTo(-pillW, -pillH, -pillW + pillR, -pillH, pillR);
      ctx.closePath();
      ctx.fillStyle = "rgba(10,10,12,0.78)";
      ctx.fill();
      ctx.strokeStyle = accent + "88";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Brand
      ctx.fillStyle = accent;
      ctx.font = `700 36px 'Satoshi', 'Helvetica Neue', system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("⬡ FREELON CITY", -pillW + 28, -pillH / 2);

      // Handle on the right side, monospace
      if (handle) {
        const h = `@${handle.replace(/^@/, "").slice(0, 18)}`;
        ctx.fillStyle = "#F5F2E8";
        ctx.font = `500 28px 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace`;
        ctx.textAlign = "right";
        ctx.fillText(h, -28, -pillH / 2);
      }
      ctx.restore();
    }
  }

  function download() {
    const c = canvasRef.current;
    if (!c) return;
    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `freelon-pfp-${handle.replace(/[^a-zA-Z0-9_]/g, "") || "citizen"}.png`;
    a.click();
  }

  return (
    <section className="pfp-studio">
      <div className="canvas-col">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="pfp-canvas"
          style={{ width: "100%", maxWidth: 640, height: "auto", aspectRatio: "1/1", display: "block" }}
        />
        <p style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.18em", color: "var(--ink-dim)", marginTop: 10, textAlign: "center", textTransform: "uppercase" }}>
          {SIZE}×{SIZE} · RETINA · PNG
        </p>
      </div>
      <div className="controls-col">
        <div className="ctrl">
          <label>UPLOAD AVATAR</label>
          <input type="file" accept="image/*" onChange={onFile} />
        </div>

        <div className="ctrl">
          <label>
            FRAME
            {holder.isHolder && <span style={{ color: "var(--gold)" }}> ⬡ HOLDER · ALL UNLOCKED</span>}
          </label>
          <div className="frame-options">
            {(["gold", "civ", "void", "platinum", "minimal"] as FrameStyle[]).map((f) => {
              const locked = HOLDER_ONLY.includes(f) && !holder.isHolder;
              const label = f === "civ" ? "CIV COLOR" : f.toUpperCase();
              return (
                <button
                  key={f}
                  className={`${frame === f ? "active" : ""} ${locked ? "locked" : ""}`}
                  onClick={() => { if (!locked) setFrame(f); }}
                  type="button"
                  disabled={locked}
                  title={locked ? "Holder-only frame. Connect a wallet that holds ≥1 citizen." : ""}
                >
                  {label}{locked ? " · LOCKED" : ""}
                </button>
              );
            })}
          </div>
          {frame === "civ" && (
            <div style={{ marginTop: 10 }}>
              <select
                value={civSlug}
                onChange={(e) => setCivSlug(e.target.value)}
                style={{ width: "100%" }}
              >
                {Object.entries(CIVS).map(([slug, c]) => (
                  <option key={slug} value={slug}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {!holder.isHolder && !holder.loading && (
            <p className="frame-note">
              GOLD · CIV · VOID frames are holder-only. <Link href="/citizens" style={{ color: "var(--gold)" }}>Own a citizen →</Link>
            </p>
          )}
        </div>

        <div className="ctrl">
          <label>ZOOM <span>{zoom.toFixed(2)}×</span></label>
          <input type="range" min={1} max={2.5} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </div>

        <div className="ctrl">
          <label>HANDLE (OPTIONAL)</label>
          <input type="text" placeholder="@yourhandle" value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={32} />
        </div>

        <div className="ctrl">
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={showSignature} onChange={(e) => setShowSignature(e.target.checked)} />
            <span>SHOW SIGNATURE STAMP</span>
          </label>
        </div>

        <button className="btn btn-primary" onClick={download} disabled={!src}>
          <span className="ttl">DOWNLOAD PFP <span className="ar">→</span></span>
        </button>
        <div className="hint">
          Set as your X / Discord / Telegram avatar. The frame spreads the signal.
        </div>
      </div>
    </section>
  );
}

// ── color helpers ────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function lighten(hex: string, t: number): string {
  return shiftHex(hex, t);
}
function darken(hex: string, t: number): string {
  return shiftHex(hex, -t);
}
function shiftHex(hex: string, t: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const adj = (c: number) => clamp(Math.round(t > 0 ? c + (255 - c) * t : c * (1 + t)), 0, 255);
  return `#${[adj(r), adj(g), adj(b)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

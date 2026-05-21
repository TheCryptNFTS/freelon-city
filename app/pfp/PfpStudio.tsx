"use client";
import { useEffect, useRef, useState } from "react";
import { useHolder } from "@/lib/useHolder";

const SIZE = 1024;
const GOLD = "#c8aa64";

type FrameStyle = "gold-thick" | "gold-thin" | "white" | "void";

const HOLDER_ONLY: ReadonlyArray<FrameStyle> = ["gold-thick", "gold-thin"];

export function PfpStudio() {
  const [src, setSrc] = useState<string | null>(null);
  const [frame, setFrame] = useState<FrameStyle>("white");
  const [zoom, setZoom] = useState(1);
  const [handle, setHandle] = useState("");
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
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = src;
  }, [src]);

  useEffect(() => { draw(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [frame, zoom, handle]);

  function draw() {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    // background
    ctx.fillStyle = "#0a0a0c";
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Hex clip
    const r = SIZE * 0.46;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.clip();

    if (img) {
      const ratio = Math.max(SIZE / img.width, SIZE / img.height) * zoom;
      const w = img.width * ratio;
      const h = img.height * ratio;
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    } else {
      ctx.fillStyle = "#15151a";
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = "#444";
      ctx.font = "32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Upload an image →", cx, cy);
    }
    ctx.restore();

    // Frame stroke
    const stroke = frame === "gold-thick" ? 18 : frame === "gold-thin" ? 8 : 14;
    const strokeColor = frame === "white" ? "#e6e1d2" : frame === "void" ? "#6a4a8a" : GOLD;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = stroke;
    ctx.lineJoin = "miter";
    ctx.miterLimit = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner halo ring
    if (frame === "gold-thick" || frame === "gold-thin") {
      ctx.strokeStyle = "rgba(200,170,100,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const rr = r + stroke / 2 + 22;
        const x = cx + rr * Math.cos(a);
        const y = cy + rr * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Bottom plate
    const plateH = 110;
    ctx.fillStyle = "rgba(10,10,12,0.85)";
    ctx.fillRect(0, SIZE - plateH, SIZE, plateH);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, SIZE - plateH);
    ctx.lineTo(SIZE, SIZE - plateH);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.font = "600 38px 'Anton', Impact, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("⬡ FREELON CITY", 40, SIZE - 50);
    ctx.font = "20px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#e6e1d2";
    ctx.textAlign = "right";
    ctx.fillText(handle ? `@${handle.replace(/^@/, "")}` : "CITIZEN", SIZE - 40, SIZE - 50);
  }

  function download() {
    const c = canvasRef.current;
    if (!c) return;
    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `freelon-pfp-${handle || "citizen"}.png`;
    a.click();
  }

  return (
    <section className="pfp-studio">
      <div className="canvas-col">
        <canvas ref={canvasRef} width={SIZE} height={SIZE} className="pfp-canvas" />
      </div>
      <div className="controls-col">
        <div className="ctrl">
          <label>UPLOAD AVATAR</label>
          <input type="file" accept="image/*" onChange={onFile} />
        </div>
        <div className="ctrl">
          <label>
            FRAME STYLE
            {holder.isHolder && <span style={{ color: "var(--gold)" }}>⬡ HOLDER · GOLD UNLOCKED</span>}
          </label>
          <div className="frame-options">
            {(["gold-thick", "gold-thin", "white", "void"] as FrameStyle[]).map((f) => {
              const locked = HOLDER_ONLY.includes(f) && !holder.isHolder;
              return (
                <button
                  key={f}
                  className={`${frame === f ? "active" : ""} ${locked ? "locked" : ""}`}
                  onClick={() => { if (!locked) setFrame(f); }}
                  type="button"
                  disabled={locked}
                  title={locked ? "Gold frames are holder-only. Connect a wallet that owns a FREELON citizen." : ""}
                >
                  {f.toUpperCase()}{locked && " ⛔"}
                </button>
              );
            })}
          </div>
          {!holder.isHolder && !holder.loading && (
            <p className="frame-note">
              Gold frames are reserved for holders. <a href="/citizens" style={{ color: "var(--gold)" }}>Own a citizen →</a>
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
        <button className="btn btn-gold" onClick={download} disabled={!src}>
          <span className="ttl">DOWNLOAD PFP <span className="ar">→</span></span>
        </button>
        <div className="hint">
          Set as your X / Discord / Telegram avatar. The frame spreads the signal.
        </div>
      </div>
    </section>
  );
}


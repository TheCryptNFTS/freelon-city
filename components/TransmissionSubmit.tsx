"use client";
import { useEffect, useState } from "react";
import { useViewerAddr, useXVerification } from "@/lib/use-viewer";
import { CIVILIZATIONS } from "@/lib/constants";
import { cityNotice } from "@/lib/city-notice";
import { proveWallet } from "@/lib/wallet-proof";

const COST = 100;
const MAX_CAPTION = 280;

const CIVS = Object.entries(CIVILIZATIONS) as Array<[string, { name: string; color: string }]>;

export function TransmissionSubmit({ onSubmitted }: { onSubmitted?: (id: string) => void }) {
  const viewer = useViewerAddr();
  const x = useXVerification(viewer.addr);

  const [civ, setCiv] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [carrierBalance, setCarrierBalance] = useState<number | null>(null);

  // Load current hex + carrier holdings when wallet is known
  useEffect(() => {
    if (!viewer.addr) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/wallet/${viewer.addr}/hex`).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/wallet/${viewer.addr}/balance`).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([hex, bal]) => {
      if (cancelled) return;
      if (hex && typeof hex.balance === "number") setBalance(hex.balance);
      if (bal && typeof bal.balance === "number") setCarrierBalance(bal.balance);
    });
    return () => { cancelled = true; };
  }, [viewer.addr]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!viewer.addr || !x.verified) return;
    const addr = viewer.addr;
    if (!civ) { setError("PICK A CIVILIZATION"); return; }
    if (caption.length < 1) { setError("CAPTION REQUIRED"); return; }
    if (caption.length > MAX_CAPTION) { setError(`CAPTION TOO LONG · ${MAX_CAPTION} MAX`); return; }
    if (!/^https:\/\/.+\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(imageUrl)) {
      setError("IMAGE URL MUST BE HTTPS AND END IN .JPG/.PNG/.WEBP/.GIF");
      return;
    }
    setBusy(true);
    const doPost = () =>
      fetch("/api/transmissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addr, civ, caption, imageUrl }),
      });
    try {
      let res = await doPost();
      let j = await res.json();
      // Submitting a transmission burns ⬡ — needs a one-time wallet signature.
      if (res.status === 401 && j?.error === "wallet_proof_required") {
        const proof = await proveWallet(addr);
        if (!proof.ok) {
          setError(
            proof.reason === "no_wallet"
              ? "OPEN IN YOUR WALLET'S BROWSER TO TRANSMIT"
              : proof.reason === "rejected"
              ? "SIGNATURE DECLINED · NEEDED ONCE TO TRANSMIT"
              : "COULDN'T PROVE WALLET · RETRY",
          );
          return;
        }
        res = await doPost();
        j = await res.json();
      }
      if (!res.ok) {
        const map: Record<string, string> = {
          invalid_address: "ADDRESS MALFORMED",
          invalid_civ: "INVALID CIVILIZATION",
          invalid_caption: "CAPTION OUT OF BOUNDS",
          image_url_must_be_https: "IMAGE MUST BE HTTPS",
          image_url_too_long: "IMAGE URL TOO LONG",
          image_url_not_recognized: "IMAGE URL UNRECOGNIZED · END IN .jpg/.png/.webp",
          session_required: "X SESSION REQUIRED",
          not_a_carrier: "CARRIER STATUS REQUIRED · HOLD ≥1 CITIZEN",
          insufficient_hex: `HEX BALANCE LOW · NEED ${COST}⬡ · HAVE ${j.balance ?? "?"}⬡`,
          debit_failed: "HEX DEBIT FAILED · RETRY",
          balance_unknown_retry: "SIGNAL LOST · RETRY",
        };
        setError(map[j.error] || `TRANSMISSION REJECTED · ${j.error || "unknown"}`);
        return;
      }
      cityNotice({
        title: "TRANSMISSION SENT",
        body: "Your signal is in the city.",
        delta: `-${j.burned}⬡`,
      });
      setCaption("");
      setImageUrl("");
      setBalance((b) => (b !== null ? b - j.burned : null));
      onSubmitted?.(j.id);
    } catch {
      setError("SIGNAL LOST · RETRY");
    } finally {
      setBusy(false);
    }
  }

  // ── render guards ──
  if (!viewer.ready) return null;

  if (!viewer.addr) {
    return (
      <div className="tx-submit-gate">
        <span className="kicker">⬡ TRANSMIT TO THE CITY</span>
        <p>Connect your wallet to submit a transmission.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => document.querySelector<HTMLButtonElement>(".wallet-connect button")?.focus(), 400);
          }}
        >
          <span className="ttl">CONNECT WALLET →</span>
        </button>
      </div>
    );
  }
  if (!x.ready) return <div className="tx-submit-gate"><span className="kicker">…</span></div>;
  if (!x.verified) {
    return (
      <div className="tx-submit-gate">
        <span className="kicker" style={{ color: "var(--state-danger)" }}>⬡ X SESSION REQUIRED</span>
        <p>Transmissions require an X session bound to this wallet.</p>
        <a className="btn btn-primary" href={`/api/x/start?bind=${encodeURIComponent(viewer.addr)}`}>
          <span className="ttl">SIGN IN WITH X →</span>
        </a>
      </div>
    );
  }
  if (carrierBalance !== null && carrierBalance < 1) {
    return (
      <div className="tx-submit-gate">
        <span className="kicker" style={{ color: "#FF8A4D" }}>⬡ CARRIER STATUS REQUIRED</span>
        <p>Hold at least 1 citizen to transmit.</p>
        <a className="btn btn-primary" href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer">
          <span className="ttl">BUY YOUR FIRST CITIZEN ↗</span>
        </a>
      </div>
    );
  }

  const overBudget = balance !== null && balance < COST;

  return (
    <form className="tx-submit" onSubmit={submit}>
      <div className="tx-submit-head">
        <span className="kicker">⬡ TRANSMIT · {COST} ⬡ BURN</span>
        <span className="tx-submit-sub">
          {balance !== null ? `${balance.toLocaleString()} ⬡ available` : "…"}
          {carrierBalance !== null && ` · ${carrierBalance} citizen${carrierBalance === 1 ? "" : "s"} held`}
        </span>
      </div>

      <label className="tx-field">
        <span>CIVILIZATION</span>
        <select value={civ} onChange={(e) => setCiv(e.target.value)} required disabled={busy}>
          <option value="">— pick a civ —</option>
          {CIVS.map(([slug, def]) => (
            <option key={slug} value={slug}>{def.name}</option>
          ))}
        </select>
      </label>

      <label className="tx-field">
        <span>CAPTION · {caption.length}/{MAX_CAPTION}</span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
          rows={3}
          placeholder="The signal moved through me at 04:04 UTC…"
          maxLength={MAX_CAPTION}
          required
          disabled={busy}
        />
      </label>

      <label className="tx-field">
        <span>IMAGE URL (https://...)</span>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://pbs.twimg.com/media/… or https://i.imgur.com/…"
          required
          disabled={busy}
        />
        <p className="tx-field-hint">
          Paste a direct image URL. Most users grab the URL from an X post by right-clicking the image → Copy Image Address.
        </p>
      </label>

      {imageUrl && /^https:\/\/.+\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(imageUrl) && (
        <div className="tx-preview">
          <span className="kicker">PREVIEW</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" />
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={busy || overBudget}>
        <span className="ttl">{busy ? "TRANSMITTING…" : overBudget ? `NEED ${COST}⬡` : `BURN ${COST}⬡ · TRANSMIT →`}</span>
      </button>
      {error && <div className="tx-submit-err">{error}</div>}
    </form>
  );
}

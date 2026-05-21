"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DeepLore } from "@/lib/deep-lore";
import { loadCarrier, spendPoints, CarrierState } from "@/lib/carrier";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";

type Props = {
  citizenId: number;
  cost: number;
  deepLore: DeepLore;
  /** First sentence shown unblurred as a preview */
  previewLine: string;
};

export function CitizenDeepLore({ citizenId, cost, deepLore, previewLine }: Props) {
  const holder = useHolder();
  const ownership = useOwnsCitizen(citizenId, holder.address);
  const [carrier, setCarrier] = useState<CarrierState | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [giftInfo, setGiftInfo] = useState<{ gifter?: string }>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unlockMode, setUnlockMode] = useState<"self" | "gift">("self");
  const [giftHandle, setGiftHandle] = useState("");

  useEffect(() => {
    setCarrier(loadCarrier());
  }, []);

  useEffect(() => {
    // Check server-side unlock state. If the citizen has been gifted by anyone,
    // it's permanently revealed for everyone.
    fetch(`/api/unlock/${citizenId}?h=${encodeURIComponent(carrier?.handle ?? "_")}`)
      .then(r => r.json())
      .then(d => {
        if (d.gift?.gifted) {
          setUnlocked(true);
          setGiftInfo({ gifter: d.gift.gifter });
        } else if (d.unlocked) {
          setUnlocked(true);
        }
      })
      .catch(() => {});
  }, [citizenId, carrier?.handle]);

  const ownerFree = ownership.isOwner;
  const canShow = unlocked || ownerFree;

  async function doUnlock() {
    setErr(null);
    if (!carrier) {
      setErr("Become a carrier first to spend hex points.");
      return;
    }
    setBusy(true);
    try {
      const isGift = unlockMode === "gift";
      const recipient = isGift ? giftHandle.replace(/^@/, "").toLowerCase() : null;
      if (isGift && !recipient) {
        setErr("Enter the recipient's handle.");
        setBusy(false);
        return;
      }
      // Server-side spend + record
      const res = await fetch(`/api/unlock/${citizenId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isGift ? "gift" : "self", handle: carrier.handle, recipient }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Unlock failed."); setBusy(false); return; }
      // Sync local hex point balance
      const updated = spendPoints(isGift ? 50 : cost);
      if (updated) setCarrier(updated);
      setUnlocked(true);
      if (isGift) setGiftInfo({ gifter: carrier.handle });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="deep-lore">
      <header className="dl-head">
        <span className="kicker">⬡ DEEP LORE · {deepLore.kind === "prose" ? "HAND-WRITTEN" : "CITIZEN READING"}</span>
        {canShow && deepLore.kind === "prose" && (
          <h3 style={{ color: "var(--gold)" }}>{deepLore.title}</h3>
        )}
        {!canShow && (
          <h3>Locked</h3>
        )}
      </header>

      {/* Preview line — always visible */}
      <p className="dl-preview">{previewLine}</p>

      {canShow ? (
        deepLore.kind === "prose" ? (
          <p className="dl-prose">{deepLore.body}</p>
        ) : (
          <dl className="dl-panel">
            {deepLore.sections.map((s) => (
              <div key={s.label}>
                <dt>{s.label.toUpperCase()}</dt>
                <dd>{s.value}</dd>
                {s.detail && <dd className="detail">{s.detail}</dd>}
              </div>
            ))}
          </dl>
        )
      ) : (
        <div className="dl-locked">
          <div className="blurred-block" aria-hidden="true">
            <div className="line w-95" />
            <div className="line w-90" />
            <div className="line w-80" />
            <div className="line w-70" />
            <div className="line w-85" />
            <div className="line w-60" />
          </div>
          <div className="dl-unlock-card">
            <div className="dl-cost">
              <span className="lbl">UNLOCK COST</span>
              <span className="val"><strong>{cost}</strong> ⬡</span>
            </div>
            {!carrier && (
              <p className="dl-msg">
                You need to <Link href="/carrier">become a carrier</Link> first — earn hex points by relaying the signal.
              </p>
            )}
            {carrier && (
              <>
                <div className="dl-mode">
                  <button
                    type="button"
                    className={unlockMode === "self" ? "active" : ""}
                    onClick={() => setUnlockMode("self")}
                  >
                    UNLOCK FOR ME
                  </button>
                  <button
                    type="button"
                    className={unlockMode === "gift" ? "active" : ""}
                    onClick={() => setUnlockMode("gift")}
                  >
                    GIFT UNLOCK · 50 ⬡
                  </button>
                </div>
                {unlockMode === "gift" && (
                  <>
                    <input
                      type="text"
                      placeholder="@recipient"
                      value={giftHandle}
                      onChange={(e) => setGiftHandle(e.target.value)}
                      className="dl-gift-input"
                    />
                    <p className="dl-gift-note">
                      Gifting makes this citizen&apos;s deep lore permanently visible to everyone. Your handle will be credited as the gifter.
                    </p>
                  </>
                )}
                <div className="dl-balance">
                  Your balance: <strong>{carrier.hexPoints} ⬡</strong>
                  {carrier.hexPoints < (unlockMode === "gift" ? 50 : cost) && (
                    <span className="dl-warn"> — not enough. <Link href="/carrier">Earn more →</Link></span>
                  )}
                </div>
                <button
                  className="btn btn-gold dl-unlock-btn"
                  onClick={doUnlock}
                  disabled={busy || carrier.hexPoints < (unlockMode === "gift" ? 50 : cost)}
                  type="button"
                >
                  <span className="lbl">{unlockMode === "gift" ? "GIFT" : "UNLOCK"}</span>
                  <span className="ttl">{busy ? "PROCESSING…" : `SPEND ${unlockMode === "gift" ? 50 : cost} ⬡`} <span className="ar">→</span></span>
                </button>
                {err && <p className="dl-err">{err}</p>}
              </>
            )}
            {ownership.isOwner && (
              <p className="dl-owner-note">
                ⬡ You own this citizen. Deep lore is free for you — should appear automatically.
              </p>
            )}
            {!ownership.loading && holder.address && !ownership.isOwner && (
              <p className="dl-owner-hint">
                Owned by <code>{ownership.ownerAddress?.slice(0, 6)}…{ownership.ownerAddress?.slice(-4)}</code>
              </p>
            )}
          </div>
        </div>
      )}

      {canShow && giftInfo.gifter && (
        <p className="dl-gift-attribution">
          Deep lore gifted by <Link href={`/carrier/${giftInfo.gifter}`}>@{giftInfo.gifter}</Link>.
        </p>
      )}
      {canShow && ownerFree && !giftInfo.gifter && (
        <p className="dl-owner-attribution">
          ⬡ Unlocked because you own this citizen.
        </p>
      )}
    </section>
  );
}

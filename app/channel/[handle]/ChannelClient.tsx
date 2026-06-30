"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";
import { useViewerAddr } from "@/lib/use-viewer";
import { CIVILIZATIONS } from "@/lib/constants";
import { gridImageUrl } from "@/lib/constants";
import { markChannel } from "@/lib/secrets-store";
import { HonoraryDisclaimer } from "@/components/HonoraryDisclaimer";

// EASTER EGG 5 — /channel/[handle]
// Unlisted (robots noindex, no nav link). Opens if the connected wallet
// owns the honorary citizen. Now checks both MetaMask-connected wallet
// AND the freelon_addr cookie (set by paste-address sync) — closes the
// "I own this but page says I don't" bug from Discord.
export function ChannelClient({ citizenId, honoree, handle, civSlug }:
  { citizenId: number; honoree: string; handle: string; civSlug: string }) {
  const holder = useHolder();
  const viewer = useViewerAddr();
  // Prefer the live MetaMask wallet (just-approved session) but
  // fall back to the cookie-saved addr so paste-users get the same unlock.
  const checkAddr = holder.address || viewer.addr;
  const owns = useOwnsCitizen(citizenId, checkAddr);
  const civ = (CIVILIZATIONS as Record<string, { color: string; name: string; chant: string }>)[civSlug];

  useEffect(() => {
    if (owns.isOwner) markChannel(handle);
  }, [owns.isOwner, handle]);

  const loading = holder.loading || owns.loading || !viewer.ready;

  return (
    <div style={{ minHeight: "80vh", padding: "64px 24px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.3em", color: civ?.color }}>
        ⬡ CHANNEL · @{handle.toUpperCase()} · TOKEN-GATED
      </div>
      <h1 style={{ marginTop: 14, fontSize: 48, fontWeight: 300, lineHeight: 1.1 }}>{honoree}</h1>
      <div>
        <HonoraryDisclaimer name={honoree} />
      </div>

      <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, alignItems: "start" }}>
        <div style={{ aspectRatio: "1/1", overflow: "hidden", border: `1px solid ${civ?.color || "var(--line)"}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gridImageUrl(citizenId, 640)} alt={honoree} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <div>
          {loading && (
            <div style={{ fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.06em", color: "var(--ink-2)" }}>
              ⬡ VERIFYING SIGNAL OWNERSHIP…
            </div>
          )}

          {!loading && !checkAddr && (
            <div style={{ padding: 18, border: "1px solid var(--line)" }}>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "var(--ink-2)" }}>
                NO WALLET CONNECTED
              </div>
              <p style={{ marginTop: 10, fontFamily: "var(--mono2)", fontSize: 12, lineHeight: 1.6 }}>
                This channel is gated to the owner of FREELON CITY #{citizenId.toString().padStart(4, "0")}.
                Connect a wallet (header) or paste your address at /sync to attempt sync.
              </p>
            </div>
          )}

          {!loading && checkAddr && owns.error && (
            <div style={{ padding: 18, border: "1px solid #E8B24766", background: "rgba(232,178,71,0.05)" }}>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "#E8B247" }}>
                ⬡ SIGNAL UNCERTAIN · RETRY
              </div>
              <p style={{ marginTop: 10, fontFamily: "var(--mono2)", fontSize: 12, lineHeight: 1.6 }}>
                Couldn&apos;t reach the chain to verify ownership. Reload the page or check {" "}
                <Link href={`/wallet/${checkAddr.toLowerCase()}`} style={{ color: "var(--gold)" }}>
                  your wallet page →
                </Link>
              </p>
            </div>
          )}

          {!loading && checkAddr && !owns.error && !owns.isOwner && (
            <div style={{ padding: 18, border: "1px solid var(--line)" }}>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "var(--ink-2)" }}>
                ⬡ SIGNAL REJECTED
              </div>
              <p style={{ marginTop: 10, fontFamily: "var(--mono2)", fontSize: 12, lineHeight: 1.6 }}>
                Only the holder of citizen #{citizenId.toString().padStart(4, "0")} can read this channel.
                Checked against <code style={{ color: "var(--ink-2)" }}>{checkAddr.slice(0, 6)}…{checkAddr.slice(-4)}</code>.
                {owns.ownerAddress && (
                  <>
                    {" "}On-chain owner is <code style={{ color: "var(--ink-2)" }}>{owns.ownerAddress.slice(0, 6)}…{owns.ownerAddress.slice(-4)}</code>.
                  </>
                )}
              </p>
              <Link href={`/citizens/${citizenId}`} style={{ marginTop: 14, display: "inline-block", fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "var(--gold)" }}>
                VIEW CITIZEN ON-CHAIN →
              </Link>
            </div>
          )}

          {!loading && owns.isOwner && (
            <div style={{ padding: 22, border: `1px solid ${civ?.color}`, background: "rgba(200,170,100,0.04)" }}>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: civ?.color }}>
                ⬡ OWNER ACKNOWLEDGED · CHANNEL OPEN
              </div>
              <h3 style={{ marginTop: 12, fontSize: 22, fontWeight: 400 }}>
                Private transmission for @{handle}.
              </h3>
              <p style={{ marginTop: 12, fontFamily: "var(--mono2)", fontSize: 13, lineHeight: 1.7 }}>
                {honoree} was named into the city because they shaped the signal we now carry.
                The chant of {civ?.name} — <em>{civ?.chant}</em> — is theirs to repeat or rewrite.
                When this citizen changes hands, the channel changes hands. Until then, it is yours.
              </p>
              <div style={{ marginTop: 18 }}>
                <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.28em", color: "var(--ink-2)", textTransform: "uppercase" }}>
                  ⬡ Channel rights · click to claim
                </span>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 8,
                  }}
                >
                  <ClaimTile
                    n="01"
                    label="DOCTRINE"
                    blurb="Name the doctrine for a day"
                    handle={handle}
                    civColor={civ?.color}
                    intent={`⬡ @4040hex · claiming DOCTRINE FOR A DAY — channel @${handle}.\n\nProposed line: "____"\n\nLogged on freeloncity.com/channel/${handle}`}
                  />
                  <ClaimTile
                    n="02"
                    label="RELAY SLOT"
                    blurb="Verified slot in today's signal queue"
                    handle={handle}
                    civColor={civ?.color}
                    intent={`⬡ @4040hex · claiming VERIFIED RELAY SLOT for today's signal queue — channel @${handle}.\n\nLogged on freeloncity.com/channel/${handle}`}
                  />
                  <ClaimTile
                    n="03"
                    label="COORDINATE"
                    blurb="Annual canon coordinate"
                    handle={handle}
                    civColor={civ?.color}
                    intent={`⬡ @4040hex · claiming ANNUAL CANON COORDINATE — channel @${handle}.\n\nLogged on freeloncity.com/channel/${handle}`}
                  />
                </div>
                <Link
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `⬡ Channel @${handle} · open.\n\n${civ?.chant ?? "WE CARRY. WE DELIVER."}\n\nfreeloncity.com/channel/${handle}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ marginTop: 14 }}
                >
                  <span className="lbl">ACKNOWLEDGE</span>
                  <span className="ttl">POST ON X <span className="ar">→</span></span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <p style={{ marginTop: 40, fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-2)" }}>
        UNLISTED · NOT INDEXED · HOLDER-ONLY · CITIZEN #{citizenId.toString().padStart(4, "0")}
      </p>
      <style>{`
        .channel-claim-tile { transition: background 120ms ease, border-color 120ms ease, transform 120ms ease; }
        .channel-claim-tile:hover { transform: translateY(-1px); filter: brightness(1.25); }
      `}</style>
    </div>
  );
}

// Per-right claim tile. Each opens a tweet-intent at @4040hex with the
// claim pre-typed so the channel owner can fire it with one click — no
// more "Coordinate via DM" dead-end. @Nonz reported the middle tile
// (RELAY SLOT) had no interaction; all three are now buttons.
//
// CSS-only hover (className + <style> tag above) to avoid an inline
// React event handler that triggered a webpack chunking failure at
// static prerender time on Next 15.5.
function ClaimTile({
  n, label, blurb, intent, handle, civColor,
}: {
  n: string;
  label: string;
  blurb: string;
  intent: string;
  handle: string;
  civColor?: string;
}) {
  const color = civColor || "var(--gold)";
  const href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(intent)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Claim ${label} for @${handle}`}
      className="channel-claim-tile"
      style={{
        display: "block",
        padding: "10px 12px",
        border: `1px solid ${color}55`,
        background: `${color}0a`,
        borderRadius: 8,
        textDecoration: "none",
        color: "var(--ink)",
        fontFamily: "var(--mono2)",
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: "0.26em", color, textTransform: "uppercase" }}>
        {n} · {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.4, color: "var(--ink)" }}>
        {blurb}
      </div>
      <div style={{ marginTop: 6, fontSize: 9, letterSpacing: "0.18em", color: "var(--ink-2)", textTransform: "uppercase" }}>
        CLAIM ON X →
      </div>
    </a>
  );
}

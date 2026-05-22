"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";
import { CIVILIZATIONS } from "@/lib/constants";
import { heroImageUrl } from "@/lib/constants";
import { markChannel } from "@/lib/secrets-store";

// EASTER EGG 5 — /channel/[handle]
// The page is unlisted (robots noindex, no nav link). Only opens if the
// connected wallet owns the honorary citizen for that handle.
export function ChannelClient({ citizenId, honoree, handle, civSlug }:
  { citizenId: number; honoree: string; handle: string; civSlug: string }) {
  const holder = useHolder();
  const owns = useOwnsCitizen(citizenId, holder.address);
  const civ = (CIVILIZATIONS as Record<string, { color: string; name: string; chant: string }>)[civSlug];

  useEffect(() => {
    if (owns.isOwner) markChannel(handle);
  }, [owns.isOwner, handle]);

  const loading = holder.loading || owns.loading;

  return (
    <main style={{ minHeight: "80vh", padding: "64px 24px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.3em", color: civ?.color }}>
        ⬡ CHANNEL · @{handle.toUpperCase()} · TOKEN-GATED
      </div>
      <h1 style={{ marginTop: 14, fontSize: 48, fontWeight: 300, lineHeight: 1.1 }}>{honoree}</h1>

      <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, alignItems: "start" }}>
        <div style={{ aspectRatio: "1/1", overflow: "hidden", border: `1px solid ${civ?.color || "var(--line)"}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImageUrl(citizenId)} alt={honoree} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <div>
          {loading && (
            <div style={{ fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.06em", color: "var(--ink-2)" }}>
              ⬡ VERIFYING SIGNAL OWNERSHIP…
            </div>
          )}

          {!loading && !holder.address && (
            <div style={{ padding: 18, border: "1px solid var(--line)" }}>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "var(--ink-2)" }}>
                NO WALLET CONNECTED
              </div>
              <p style={{ marginTop: 10, fontFamily: "var(--mono2)", fontSize: 12, lineHeight: 1.6 }}>
                This channel is gated to the owner of FREELON CITY #{citizenId.toString().padStart(4, "0")}.
                Connect a wallet to attempt sync.
              </p>
            </div>
          )}

          {!loading && holder.address && !owns.isOwner && (
            <div style={{ padding: 18, border: "1px solid var(--line)" }}>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "var(--ink-2)" }}>
                ⬡ SIGNAL REJECTED
              </div>
              <p style={{ marginTop: 10, fontFamily: "var(--mono2)", fontSize: 12, lineHeight: 1.6 }}>
                Only the holder of citizen #{citizenId.toString().padStart(4, "0")} can read this channel.
                The honoree carries a private frequency.
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
              <p style={{ marginTop: 14, fontFamily: "var(--mono2)", fontSize: 12, lineHeight: 1.7, color: "var(--ink-2)" }}>
                Channel rights: name the doctrine for a day, claim a verified relay slot in the daily signal queue,
                and one annual coordinate inside FREELON CITY canon. Coordinate via DM.
              </p>
              <Link
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `⬡ Channel @${handle} · open.\n\n${civ?.chant ?? "WE CARRY. WE DELIVER."}\n\nfreeloncity.com/channel/${handle}`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ marginTop: 18 }}
              >
                <span className="lbl">ACKNOWLEDGE</span>
                <span className="ttl">POST ON X <span className="ar">→</span></span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <p style={{ marginTop: 40, fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-2)" }}>
        UNLISTED · NOT INDEXED · HOLDER-ONLY · CITIZEN #{citizenId.toString().padStart(4, "0")}
      </p>
    </main>
  );
}

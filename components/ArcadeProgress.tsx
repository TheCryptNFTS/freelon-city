"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PROGRESS_EVENT,
  getProgress,
  rankFor,
  nextRank,
  rankProgress,
  unlockedTitles,
  equipTitle,
  cosmeticsForSlot,
  isCosmeticUnlocked,
  equipCosmetic,
  type ProgressState,
  type CosmeticSlot,
} from "@/lib/arcade-progress";

const COSMETIC_SLOTS: { slot: CosmeticSlot; label: string }[] = [
  { slot: "hexSkin", label: "Hex Match · Tile Skin" },
  { slot: "sweepTheme", label: "Sweep Run · Board Theme" },
  { slot: "cipherTheme", label: "Cipher · Terminal Colorway" },
];

/**
 * Signal Rank card for the arcade hub. Reads the local-only meta-progression
 * blob and lets the player equip any title they've earned. Purely cosmetic —
 * no wallet, no server, no economy. Live-updates when any game awards XP via
 * the PROGRESS_EVENT window event.
 */
export function ArcadeProgress() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<ProgressState | null>(null);

  useEffect(() => {
    setMounted(true);
    setState(getProgress());
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<ProgressState>).detail;
      setState(detail ?? getProgress());
    };
    window.addEventListener(PROGRESS_EVENT, onUpdate);
    return () => window.removeEventListener(PROGRESS_EVENT, onUpdate);
  }, []);

  const equip = useCallback((title: string | null) => {
    setState(equipTitle(title));
  }, []);

  const equipSkin = useCallback((slot: CosmeticSlot, id: string) => {
    setState(equipCosmetic(slot, id));
  }, []);

  // Stable pre-mount shell avoids an SSR/hydration mismatch (xp is client-only).
  if (!mounted || !state) return null;

  const rank = rankFor(state.xp);
  const next = nextRank(state.xp);
  const pct = Math.round(rankProgress(state.xp) * 100);
  const titles = unlockedTitles(state.xp);

  return (
    <section
      style={{
        maxWidth: 1000,
        margin: "36px auto 0",
        border: "1px solid var(--line)",
        borderTop: `2px solid ${rank.accent}`,
        background: "var(--bg-2)",
        padding: "22px 22px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.28em",
            color: "var(--ink-fade)",
            textTransform: "uppercase",
          }}
        >
          ⬡ SIGNAL RANK · LOCAL
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "var(--ink-fade)",
          }}
        >
          {state.plays} RUN{state.plays === 1 ? "" : "S"} · {state.xp.toLocaleString()} XP
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--display)",
            fontSize: 34,
            lineHeight: 1,
            color: rank.accent,
          }}
        >
          {rank.name}
        </span>
        {state.title && (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              letterSpacing: "0.12em",
              color: "var(--ink-dim)",
              fontStyle: "italic",
            }}
          >
            “{state.title}”
          </span>
        )}
      </div>

      {/* XP bar toward the next rank */}
      <div
        style={{
          height: 8,
          borderRadius: 5,
          background: "var(--line)",
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: rank.accent,
            boxShadow: `0 0 10px ${rank.accent}`,
            transition: "width .4s ease",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          color: "var(--ink-fade)",
          marginBottom: 18,
        }}
      >
        {next
          ? `${(next.minXp - state.xp).toLocaleString()} XP TO ${next.name}`
          : "MAX RANK — SOVEREIGN SIGNAL"}
      </div>

      {/* earned titles — equip one as your cosmetic identity */}
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "var(--ink-fade)",
          marginBottom: 10,
          textTransform: "uppercase",
        }}
      >
        Titles Earned
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {titles.map((t) => {
          const active = state.title === t;
          return (
            <button
              key={t}
              onClick={() => equip(active ? null : t)}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                padding: "6px 12px",
                cursor: "pointer",
                borderRadius: 6,
                border: `1px solid ${active ? rank.accent : "var(--line)"}`,
                background: active ? rank.accent : "transparent",
                color: active ? "#0a0e27" : "var(--ink-dim)",
                transition: "all .15s",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* cosmetics — purely-visual skins gated by lifetime XP, equip per game */}
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "var(--ink-fade)",
          margin: "22px 0 12px",
          textTransform: "uppercase",
        }}
      >
        Cosmetics
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        {COSMETIC_SLOTS.map(({ slot, label }) => {
          const equippedId = state.equipped[slot] ?? cosmeticsForSlot(slot)[0]?.id;
          return (
            <div key={slot}>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: "var(--ink-dim)",
                  marginBottom: 8,
                }}
              >
                {label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {cosmeticsForSlot(slot).map((c) => {
                  const unlocked = isCosmeticUnlocked(c, state.xp);
                  const active = equippedId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => unlocked && equipSkin(slot, c.id)}
                      disabled={!unlocked}
                      title={
                        unlocked
                          ? c.name
                          : `Locked · ${c.minXp.toLocaleString()} XP`
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        padding: "6px 11px",
                        cursor: unlocked ? "pointer" : "not-allowed",
                        borderRadius: 6,
                        border: `1px solid ${active ? c.accent : "var(--line)"}`,
                        background: active ? "var(--bg)" : "transparent",
                        color: unlocked ? "var(--ink-dim)" : "var(--ink-fade)",
                        opacity: unlocked ? 1 : 0.55,
                        transition: "all .15s",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: c.accent,
                          boxShadow: active ? `0 0 8px ${c.accent}` : "none",
                          flex: "none",
                        }}
                      />
                      {unlocked ? c.name : `× ${c.minXp.toLocaleString()} XP`}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

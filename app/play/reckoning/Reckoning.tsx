"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CivGlyph } from "@/components/CivGlyph";
import { CIVILIZATIONS } from "@/lib/constants";
import { RECKONING_MIN_TRIBUTE, RECKONING_SOFTCAP, warPointsMarginal } from "@/lib/reckoning-config";
import { tweetReckoning, tweetIntent } from "@/lib/share";
import { useHolder } from "@/lib/useHolder";
import { cue } from "@/lib/arcade-feedback";
import { ArcadeSoundToggle } from "@/components/ArcadeSoundToggle";
import { ArcadeTutorial } from "@/components/ArcadeTutorial";

type CivRow = { slug: string; score: number; rawHex: number; tributes: number };
type General = { address: string; score: number; rawHex: number; topCiv: string | null };
type ArchiveEntry = {
  week: number;
  winner: string | null;
  winnerName: string | null;
  score: number;
  rawHex: number;
  endedTs: number;
};
type WalletView = {
  address: string;
  score: number;
  rawHex: number;
  heldByCiv: Record<string, number>;
  musterByCiv: Record<string, number>;
  rawByCiv?: Record<string, number>;
};
type State = {
  week: number;
  weekStartTs: number;
  weekEndTs: number;
  civs: CivRow[];
  leader: string | null;
  totalScore: number;
  totalHex: number;
  archive: ArchiveEntry[];
  generals: General[];
  wallet: WalletView | null;
};

const CIVS = CIVILIZATIONS as Record<
  string,
  { name: string; color: string; doctrine: string; essence: string }
>;

const fmt = (n: number) => Math.floor(n).toLocaleString();
const shortAddr = (a: string) => `0x${a.slice(2, 6)}…${a.slice(-4)}`;

function countdown(toTs: number): string {
  const ms = Math.max(0, toTs - Date.now());
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function Reckoning() {
  const { address } = useHolder();
  const [state, setState] = useState<State | null>(null);
  const [selected, setSelected] = useState<string>("blue-synthesis");
  const [amount, setAmount] = useState<string>(String(RECKONING_MIN_TRIBUTE));
  const [walletHex, setWalletHex] = useState<number | null>(null);
  const [xVerified, setXVerified] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBurn, setLastBurn] = useState<{ civ: string; burned: number; rank: number | null } | null>(null);
  const [, force] = useState(0);

  // Live momentum: war-signal gained per civ since the previous refresh. Pure
  // client-side derivation from the server-authoritative board — we snapshot
  // each civ's score and diff it on the next poll, so the board can show which
  // side is actually surging right now. Reads only; writes nothing.
  const [momentum, setMomentum] = useState<Record<string, number>>({});
  const prevCivScores = useRef<Record<string, number> | null>(null);

  // Re-render every 30s so the countdown ticks AND the war board re-polls for
  // live momentum (the endgame leans on a fresh lead margin).
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const loadState = useCallback(async () => {
    try {
      const q = address ? `?address=${address}` : "";
      const r = await fetch(`/api/reckoning/state${q}`, { cache: "no-store" });
      if (!r.ok) return;
      const s = (await r.json()) as State;
      setState(s);
      // diff against the previous snapshot to surface live momentum
      const prev = prevCivScores.current;
      const snap: Record<string, number> = {};
      for (const c of s.civs) snap[c.slug] = c.score;
      if (prev) {
        const delta: Record<string, number> = {};
        for (const c of s.civs) {
          const d = c.score - (prev[c.slug] ?? c.score);
          if (d > 0) delta[c.slug] = d;
        }
        setMomentum(delta);
      }
      prevCivScores.current = snap;
    } catch {
      /* keep prior */
    }
  }, [address]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Poll the board on the same 30s cadence as the countdown tick.
  useEffect(() => {
    const id = setInterval(() => loadState(), 30_000);
    return () => clearInterval(id);
  }, [loadState]);

  // Wallet hex balance + X-verification (same pattern as TitheForm).
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/wallet/${address}/hex`)
      .then((r) => r.json())
      .then((j: { balance?: number }) => {
        if (!cancelled && typeof j.balance === "number") setWalletHex(j.balance);
      })
      .catch(() => {});
    fetch(`/api/x/me?bind=${address}`)
      .then((r) => r.json())
      .then((j: { verification?: unknown }) => {
        if (!cancelled) setXVerified(!!j.verification);
      })
      .catch(() => {
        if (!cancelled) setXVerified(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  // Board sorted by score desc, canonical order as tiebreak.
  const ranked = useMemo(() => {
    if (!state) return [];
    const order = Object.keys(CIVS);
    return [...state.civs].sort(
      (a, b) => b.score - a.score || order.indexOf(a.slug) - order.indexOf(b.slug),
    );
  }, [state]);

  const maxScore = ranked.reduce((m, c) => Math.max(m, c.score), 0) || 1;
  const rankOf = (slug: string) => ranked.findIndex((c) => c.slug === slug) + 1 || null;

  // ── live momentum + endgame tension (derived, read-only) ─────────────────
  // The single biggest gainer since the last refresh is "surging".
  const surgeSlug = useMemo(() => {
    let best: string | null = null;
    let bestD = 0;
    for (const [slug, d] of Object.entries(momentum)) {
      if (d > bestD) {
        bestD = d;
        best = slug;
      }
    }
    return best;
  }, [momentum]);

  // Endgame: how close to the crown, and how tight is the race. As the week
  // closes the board gets louder; a narrow lead reads as CONTESTED.
  const msLeft = state ? Math.max(0, state.weekEndTs - Date.now()) : Infinity;
  const finalHours = state ? msLeft <= 6 * 3_600_000 && state.totalScore > 0 : false;
  const finalDay = state ? msLeft <= 24 * 3_600_000 && state.totalScore > 0 : false;
  const leadMargin = ranked.length >= 2 ? ranked[0].score - ranked[1].score : ranked[0]?.score ?? 0;
  const contested = ranked.length >= 2 && ranked[0].score > 0 && leadMargin <= ranked[0].score * 0.15;
  const leaderCiv = ranked[0] ? CIVS[ranked[0].slug] : null;

  // ── hall of crowns — dynasty tally from the archive (read-only) ──────────
  const crownTally = useMemo(() => {
    const t: Record<string, number> = {};
    for (const a of state?.archive ?? []) if (a.winner) t[a.winner] = (t[a.winner] ?? 0) + 1;
    return t;
  }, [state]);
  const dynasty = useMemo(() => {
    let slug: string | null = null;
    let n = 0;
    for (const [s, c] of Object.entries(crownTally)) if (c > n) ((n = c), (slug = s));
    return slug ? { slug, crowns: n } : null;
  }, [crownTally]);
  const crownedCivs = useMemo(
    () =>
      Object.entries(crownTally).sort(
        (a, b) => b[1] - a[1] || Object.keys(CIVS).indexOf(a[0]) - Object.keys(CIVS).indexOf(b[0]),
      ),
    [crownTally],
  );

  const amountN = parseInt(amount, 10);
  const validAmount = Number.isFinite(amountN) && amountN >= RECKONING_MIN_TRIBUTE;
  const muster = state?.wallet?.musterByCiv?.[selected] ?? 1;
  const held = state?.wallet?.heldByCiv?.[selected] ?? 0;
  // Project the real anti-whale curve: war points for this tribute depend on
  // how much this wallet has already poured into this civ this week. Past the
  // soft cap, each extra hex earns diminishing signal — so the projection
  // matches what the server will actually award (no hidden nerf).
  const rawSoFar = state?.wallet?.rawByCiv?.[selected] ?? 0;
  const projectedPoints = validAmount
    ? warPointsMarginal(rawSoFar, amountN, held)
    : 0;
  const damped = validAmount && projectedPoints < Math.floor(amountN * muster);
  const afterBurn = walletHex !== null && validAmount ? Math.max(0, walletHex - amountN) : null;

  const tribute = useCallback(async () => {
    if (!address || busy || !validAmount) return;
    setBusy(true);
    setError(null);
    setLastBurn(null);
    try {
      const r = await fetch("/api/reckoning/tribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, civ: selected, amount: amountN }),
      });
      const j = await r.json();
      if (!r.ok) {
        if (j?.error === "x_session_required")
          setError("NO X SIGNAL · sign in to bind your handle to this wallet.");
        else if (j?.error === "wallet_not_bound_to_session")
          setError("WALLET NOT BOUND · sign in with X using this wallet.");
        else if (j?.error === "insufficient_hex")
          setError(`HEX LOW · need ${fmt(j.needed)} ⬡ · have ${fmt(j.balance)} ⬡`);
        else if (typeof j?.error === "string" && j.error.startsWith("min_tribute_"))
          setError(`TRIBUTE FLOOR · minimum ${RECKONING_MIN_TRIBUTE} ⬡`);
        else setError(j?.error || `TRANSMISSION FAILED · ${r.status}`);
        cue("error");
        return;
      }
      if (typeof j.burned === "number") setWalletHex((h) => (h !== null ? Math.max(0, h - j.burned) : h));
      await loadState();
      setLastBurn({ civ: selected, burned: j.burned, rank: rankOf(selected) });
      cue("special");
      window.dispatchEvent(new CustomEvent("freelon:hex-refresh"));
    } catch {
      setError("SIGNAL LOST · retry");
      cue("error");
    } finally {
      setBusy(false);
    }
  }, [address, busy, validAmount, selected, amountN, loadState]);

  const shareStandings = useCallback(() => {
    if (!state) return;
    const leaderName = state.leader ? CIVS[state.leader]?.name ?? state.leader : "No civ yet";
    window.open(
      tweetIntent(
        tweetReckoning({ week: state.week, mode: "standings", civName: leaderName }),
      ),
      "_blank",
      "noopener",
    );
  }, [state]);

  const shareRally = useCallback(() => {
    if (!state || !lastBurn) return;
    window.open(
      tweetIntent(
        tweetReckoning({
          week: state.week,
          mode: "rally",
          civName: CIVS[lastBurn.civ]?.name ?? lastBurn.civ,
          burned: lastBurn.burned,
          rank: lastBurn.rank,
        }),
      ),
      "_blank",
      "noopener",
    );
  }, [state, lastBurn]);

  const sel = CIVS[selected];

  return (
    <div className="manifesto">
      <section className="manifesto-hero">
        <span className="kicker">⬡ FREELON CITY · ARCADE · PROTOTYPE</span>
        <h1>
          The <em>Reckoning</em>.
        </h1>
        <p className="lead">
          Ten civilizations. One crown a week. Burn real hex to muster for your
          side — the civ with the most war signal when the week ends is crowned,
          and the city remembers.
        </p>
        {state && (
          <div className="reck-meta">
            <span>WEEK {state.week}</span>
            <span className="reck-dot">·</span>
            <span>{countdown(state.weekEndTs)} LEFT</span>
            <span className="reck-dot">·</span>
            <span>{fmt(state.totalHex)} ⬡ BURNED</span>
          </div>
        )}

        {/* endgame tension — the week is closing and the crown is near */}
        {finalDay && leaderCiv && (
          <div
            className={`reck-endgame${finalHours ? " is-final" : ""}`}
            style={{ ["--civ" as string]: leaderCiv.color }}
          >
            <span className="reck-endgame-tag">{finalHours ? "⬡ FINAL HOURS" : "⬡ CLOSING"}</span>
            {contested ? (
              <span className="reck-endgame-msg">
                DEAD HEAT · <strong>{leaderCiv.name}</strong> leads by just {fmt(leadMargin)}
              </span>
            ) : (
              <span className="reck-endgame-msg">
                <strong>{leaderCiv.name}</strong> holds the crown by {fmt(leadMargin)} signal
              </span>
            )}
            <span className="reck-endgame-clock">{countdown(state!.weekEndTs)} to crown</span>
          </div>
        )}
      </section>

      {/* ── WAR BOARD ─────────────────────────────────────────── */}
      <section className="reck-board">
        {ranked.map((c, i) => {
          const civ = CIVS[c.slug];
          const isLeader = state?.leader === c.slug;
          const isSel = selected === c.slug;
          const pct = Math.max(2, Math.round((c.score / maxScore) * 100));
          const gained = momentum[c.slug] ?? 0;
          const isSurging = surgeSlug === c.slug && gained > 0;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                cue("tap");
                setSelected(c.slug);
              }}
              className={`reck-row${isSel ? " is-sel" : ""}${isLeader ? " is-leader" : ""}${isSurging ? " is-surging" : ""}`}
              style={{ ["--civ" as string]: civ?.color ?? "#888" }}
            >
              <span className="reck-rank">{isLeader ? "★" : String(i + 1).padStart(2, "0")}</span>
              <CivGlyph slug={c.slug} color={civ?.color ?? "#888"} size={26} title={civ?.name} />
              <span className="reck-civ">
                <span className="reck-civ-name">
                  {civ?.name ?? c.slug}
                  {isSurging && <span className="reck-surge">▲ SURGING</span>}
                </span>
                <span className="reck-civ-doc">{civ?.doctrine}</span>
              </span>
              <span className="reck-bar-wrap">
                <span className="reck-bar" style={{ width: `${pct}%` }} />
              </span>
              <span className="reck-score">
                <span className="reck-score-n">
                  {fmt(c.score)}
                  {gained > 0 && <span className="reck-gain">+{fmt(gained)}</span>}
                </span>
                <span className="reck-score-l">{c.tributes} tribute{c.tributes === 1 ? "" : "s"}</span>
              </span>
            </button>
          );
        })}
        {state && state.totalScore === 0 && (
          <p className="reck-empty">The war is silent. Be the first to muster a civ this week.</p>
        )}
      </section>

      {/* ── TRIBUTE PANEL ─────────────────────────────────────── */}
      <section className="reck-tribute" style={{ ["--civ" as string]: sel?.color ?? "#888" }}>
        <div className="reck-tribute-head">
          <span className="kicker">⬡ MUSTER FOR {(sel?.name ?? selected).toUpperCase()}</span>
          <span className="reck-tribute-sub">{sel?.essence}</span>
        </div>

        {!address ? (
          <div className="reck-note">
            <strong>No wallet detected.</strong> Connect or{" "}
            <a href="/sync">sync your address →</a> to pick a side and burn.
          </div>
        ) : xVerified === false ? (
          <div className="reck-note reck-note-warn">
            ⚠ This wallet isn&apos;t X-verified. Tributes burn real hex and require an X session.{" "}
            <a href={`/api/x/start?bind=${address}`}>Sign in with X →</a>
          </div>
        ) : (
          <>
            <div className="reck-form">
              <label className="reck-field">
                <span>AMOUNT ⬡ (min {RECKONING_MIN_TRIBUTE})</span>
                <input
                  type="number"
                  min={RECKONING_MIN_TRIBUTE}
                  step={50}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={busy}
                />
              </label>
              <div className="reck-muster">
                <span className="reck-muster-l">MUSTER</span>
                <span className="reck-muster-x">{muster.toFixed(2)}×</span>
                <span className="reck-muster-d">
                  {held > 0
                    ? `${held} ${sel?.name ?? selected} citizen${held === 1 ? "" : "s"} held`
                    : "hold this civ to amplify"}
                </span>
              </div>
            </div>

            {validAmount && (
              <div className="reck-project">
                <span>{fmt(amountN)} ⬡ burned</span>
                <span className="reck-arrow">→</span>
                <span style={{ color: sel?.color }}>+{fmt(projectedPoints)} war signal</span>
                {walletHex !== null && afterBurn !== null && (
                  <span className="reck-balance">
                    · balance {fmt(walletHex)} → {fmt(afterBurn)} ⬡
                  </span>
                )}
              </div>
            )}

            {damped && (
              <div className="reck-damp">
                ⬡ DIMINISHING SIGNAL · you&apos;ve passed {fmt(RECKONING_SOFTCAP)} ⬡ to this
                civ this week, so each extra hex now earns less. Rally more
                citizens to your side — a coalition out-signals one lone whale.
              </div>
            )}

            {error && <div className="reck-err">{error}</div>}

            {lastBurn ? (
              <div className="reck-ok">
                <div>
                  ⬡ Mustered <strong>{fmt(lastBurn.burned)} ⬡</strong> for{" "}
                  <strong style={{ color: CIVS[lastBurn.civ]?.color }}>
                    {CIVS[lastBurn.civ]?.name}
                  </strong>
                  .
                </div>
                <div className="reck-ok-actions">
                  <button type="button" className="btn btn-primary" onClick={shareRally}>
                    SHARE TO X →
                  </button>
                  <button type="button" className="btn" onClick={() => setLastBurn(null)}>
                    BURN AGAIN
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary reck-burn"
                disabled={busy || !validAmount}
                onClick={tribute}
                style={{ borderColor: sel?.color, background: sel?.color, color: "var(--bg)" }}
              >
                {busy ? "BURNING…" : `BURN ${validAmount ? fmt(amountN) : "—"} ⬡ FOR ${(sel?.name ?? selected).toUpperCase()} →`}
              </button>
            )}
          </>
        )}
      </section>

      {/* ── HALL OF CROWNS — dynasties forged across past weeks ─── */}
      {crownedCivs.length > 0 && (
        <section className="reck-hall">
          <h3 className="reck-col-h">
            HALL OF CROWNS
            {dynasty && (
              <span className="reck-dynasty" style={{ ["--civ" as string]: CIVS[dynasty.slug]?.color ?? "#888" }}>
                ★ DYNASTY · {CIVS[dynasty.slug]?.name ?? dynasty.slug} · {dynasty.crowns}×
              </span>
            )}
          </h3>
          <div className="reck-hall-grid">
            {crownedCivs.map(([slug, crowns]) => {
              const civ = CIVS[slug];
              const isDynasty = dynasty?.slug === slug;
              return (
                <div
                  key={slug}
                  className={`reck-crown${isDynasty ? " is-dynasty" : ""}`}
                  title={`${civ?.name ?? slug} · ${crowns} crown${crowns === 1 ? "" : "s"}`}
                  style={{ ["--civ" as string]: civ?.color ?? "#888" }}
                >
                  <CivGlyph slug={slug} color={civ?.color ?? "#888"} size={22} title={civ?.name} />
                  <span className="reck-crown-name">{civ?.name ?? slug}</span>
                  <span className="reck-crown-n">{"★".repeat(Math.min(crowns, 5))}{crowns > 5 ? ` ${crowns}` : ""}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── GENERALS + ARCHIVE ────────────────────────────────── */}
      <section className="reck-cols">
        <div className="reck-col">
          <h3 className="reck-col-h">TOP GENERALS · WEEK {state?.week ?? "—"}</h3>
          {state && state.generals.length > 0 ? (
            <ol className="reck-list">
              {state.generals.map((g, i) => {
                const me = address && g.address.toLowerCase() === address.toLowerCase();
                const civ = g.topCiv ? CIVS[g.topCiv] : null;
                return (
                  <li key={g.address} className={me ? "is-me" : ""}>
                    <span className="reck-li-rank">{String(i + 1).padStart(2, "0")}</span>
                    <span className="reck-li-addr" style={civ ? { color: civ.color } : undefined}>
                      {shortAddr(g.address)}
                      {me ? " · YOU" : ""}
                    </span>
                    <span className="reck-li-num">{fmt(g.score)}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="reck-empty-sm">No generals yet. Take the lead.</p>
          )}
          <button type="button" className="btn reck-share-standings" onClick={shareStandings}>
            SHARE THE STANDINGS →
          </button>
        </div>

        <div className="reck-col">
          <h3 className="reck-col-h">PAST CROWNS</h3>
          {state && state.archive.length > 0 ? (
            <ol className="reck-list">
              {state.archive.slice(0, 12).map((a) => {
                const civ = a.winner ? CIVS[a.winner] : null;
                return (
                  <li key={a.week}>
                    <span className="reck-li-rank">W{a.week}</span>
                    <span
                      className="reck-li-addr"
                      style={civ ? { color: civ.color } : { color: "var(--ink-fade)" }}
                    >
                      {a.winnerName ?? "— no contest —"}
                    </span>
                    <span className="reck-li-num">{a.score ? fmt(a.score) : ""}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="reck-empty-sm">No weeks crowned yet. The first reckoning is now.</p>
          )}
        </div>
      </section>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28 }}>
        <ArcadeSoundToggle />
        <ArcadeTutorial
          game="reckoning"
          title="The Reckoning"
          accent="var(--neon-magenta)"
          steps={[
            { glyph: "⬡", text: "Ten civilizations fight for one crown each week. Pick the side you'll muster for." },
            { glyph: "✦", text: "Burn hex to muster — your tribute amplifies your civ's signal on the board." },
            { glyph: "⚖", text: "Pour too much into one civ and your signal diminishes — many backers out-signal a lone whale, so rally allies, don't go solo." },
            { glyph: "★", text: "The leading civ when the week ends is crowned, and the city remembers it forever." },
          ]}
        />
      </div>

      <p className="reck-foot">
        PROTOTYPE · TRIBUTES BURN REAL HEX (A SINK · NEVER MINTED) · WINNER CROWNED WEEKLY · GLORY ONLY FOR NOW
      </p>

      <style>{`
        .reck-meta { margin-top: 18px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; color: var(--ink-dim); display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .reck-dot { color: var(--ink-fade); }

        .reck-board { max-width: 760px; margin: 28px auto 0; display: flex; flex-direction: column; gap: 8px; }
        .reck-row { display: grid; grid-template-columns: 28px 26px minmax(120px, 1.4fr) minmax(80px, 2fr) auto; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 11px 14px; background: var(--bg-2); border: 1px solid var(--line); border-left: 2px solid var(--civ); cursor: pointer; transition: border-color .15s, background .15s, transform .12s; }
        .reck-row:hover { transform: translateX(2px); border-color: var(--civ); }
        .reck-row.is-sel { background: color-mix(in srgb, var(--civ) 10%, var(--bg-2)); border-color: var(--civ); }
        .reck-row.is-leader { border-left-width: 3px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--civ) 30%, transparent); }
        .reck-rank { font-family: var(--mono); font-size: 13px; color: var(--ink-dim); text-align: center; }
        .reck-civ { display: flex; flex-direction: column; min-width: 0; }
        .reck-civ-name { font-family: var(--display); font-size: 15px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .reck-civ-doc { font-family: var(--mono); font-size: 9px; letter-spacing: 0.14em; color: var(--ink-fade); text-transform: uppercase; }
        .reck-bar-wrap { height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
        .reck-bar { display: block; height: 100%; background: var(--civ); border-radius: 4px; transition: width .4s ease; box-shadow: 0 0 8px var(--civ); }
        .reck-score { text-align: right; display: flex; flex-direction: column; }
        .reck-score-n { font-family: var(--mono); font-size: 14px; color: var(--ink); }
        .reck-score-l { font-family: var(--mono); font-size: 9px; color: var(--ink-fade); }
        .reck-empty, .reck-empty-sm { text-align: center; color: var(--ink-fade); font-family: var(--mono); font-size: 12px; }
        .reck-empty { margin-top: 14px; }

        .reck-tribute { max-width: 760px; margin: 22px auto 0; border: 1px solid var(--line); border-top: 2px solid var(--civ); background: var(--bg-2); padding: 20px 20px 22px; }
        .reck-tribute-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
        .reck-tribute-head .kicker { color: var(--civ); }
        .reck-tribute-sub { font-family: var(--mono); font-size: 11px; color: var(--ink-dim); font-style: italic; }
        .reck-note { padding: 12px 14px; border: 1px solid var(--line); background: var(--bg); font-family: var(--mono); font-size: 12px; color: var(--ink-dim); line-height: 1.6; }
        .reck-note a { color: var(--civ); }
        .reck-note-warn { border-color: #FF5A4D88; background: rgba(255,90,77,0.08); color: #FF5A4D; }
        .reck-note-warn a { color: #FF5A4D; text-decoration: underline; }
        .reck-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: end; }
        .reck-field { display: flex; flex-direction: column; gap: 6px; }
        .reck-field span { font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; color: var(--ink-fade); }
        .reck-field input { background: var(--bg); border: 1px solid var(--line); color: var(--ink); padding: 10px 12px; font-family: var(--mono); font-size: 15px; }
        .reck-field input:focus { outline: none; border-color: var(--civ); }
        .reck-muster { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border: 1px dashed color-mix(in srgb, var(--civ) 45%, var(--line)); }
        .reck-muster-l { font-family: var(--mono); font-size: 9px; letter-spacing: 0.18em; color: var(--ink-fade); }
        .reck-muster-x { font-family: var(--display); font-size: 22px; color: var(--civ); line-height: 1; }
        .reck-muster-d { font-family: var(--mono); font-size: 9px; color: var(--ink-fade); }
        .reck-project { margin-top: 14px; font-family: var(--mono); font-size: 12px; color: var(--ink-dim); display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .reck-arrow { color: var(--ink-fade); }
        .reck-balance { color: var(--ink-fade); }
        .reck-damp { margin-top: 10px; padding: 9px 12px; border: 1px dashed color-mix(in srgb, var(--gold-bright) 45%, var(--line)); background: rgba(200,167,93,0.07); color: var(--ink-dim); font-family: var(--mono); font-size: 11px; line-height: 1.5; }
        .reck-err { margin-top: 12px; padding: 10px 12px; border: 1px solid #FF5A4D88; background: rgba(255,90,77,0.08); color: #FF5A4D; font-family: var(--mono); font-size: 12px; }
        .reck-burn { margin-top: 16px; width: 100%; font-family: var(--mono); letter-spacing: 0.06em; }
        .reck-ok { margin-top: 16px; font-family: var(--mono); font-size: 13px; color: var(--ink); line-height: 1.6; }
        .reck-ok-actions { display: flex; gap: 10px; margin-top: 12px; }

        .reck-cols { max-width: 760px; margin: 28px auto 0; display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .reck-col-h { font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; color: var(--ink-dim); margin: 0 0 12px; }
        .reck-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
        .reck-list li { display: grid; grid-template-columns: 34px 1fr auto; gap: 10px; align-items: center; padding: 7px 10px; background: var(--bg-2); border: 1px solid var(--line); font-family: var(--mono); font-size: 12px; }
        .reck-list li.is-me { border-color: var(--gold-bright); }
        .reck-li-rank { color: var(--ink-fade); }
        .reck-li-addr { color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .reck-li-num { color: var(--ink-dim); text-align: right; }
        .reck-share-standings { margin-top: 14px; width: 100%; font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; }

        .reck-foot { text-align: center; margin-top: 36px; font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; color: var(--ink-fade); }

        /* endgame tension banner */
        .reck-endgame { max-width: 620px; margin: 18px auto 0; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; padding: 10px 16px; border: 1px solid color-mix(in srgb, var(--civ) 50%, var(--line)); border-left: 3px solid var(--civ); background: color-mix(in srgb, var(--civ) 8%, var(--bg-2)); font-family: var(--mono); font-size: 12px; }
        .reck-endgame-tag { color: var(--civ); letter-spacing: 0.16em; font-size: 10px; }
        .reck-endgame-msg { color: var(--ink-dim); }
        .reck-endgame-msg strong { color: var(--civ); }
        .reck-endgame-clock { color: var(--ink-fade); font-size: 10px; letter-spacing: 0.12em; }
        .reck-endgame.is-final { animation: reck-pulse 1.8s ease-in-out infinite; }
        @keyframes reck-pulse {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50% { box-shadow: 0 0 22px color-mix(in srgb, var(--civ) 45%, transparent); }
        }

        /* live momentum on the board */
        .reck-row.is-surging { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--civ) 45%, transparent), 0 0 16px color-mix(in srgb, var(--civ) 25%, transparent); }
        .reck-surge { margin-left: 8px; font-family: var(--mono); font-size: 8px; letter-spacing: 0.14em; color: var(--civ); vertical-align: middle; animation: reck-blink 1.4s steps(2, start) infinite; }
        .reck-gain { display: block; font-family: var(--mono); font-size: 9px; color: var(--civ); margin-top: 1px; }
        @keyframes reck-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

        /* hall of crowns */
        .reck-hall { max-width: 760px; margin: 28px auto 0; }
        .reck-dynasty { margin-left: 12px; font-size: 9px; letter-spacing: 0.12em; color: var(--civ); }
        .reck-hall-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
        .reck-crown { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--bg-2); border: 1px solid var(--line); border-left: 2px solid var(--civ); }
        .reck-crown.is-dynasty { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--civ) 35%, transparent); }
        .reck-crown-name { font-family: var(--mono); font-size: 11px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .reck-crown-n { font-family: var(--mono); font-size: 10px; color: var(--civ); letter-spacing: 0.04em; white-space: nowrap; }

        @media (prefers-reduced-motion: reduce) {
          .reck-endgame.is-final, .reck-surge { animation: none; }
        }

        @media (max-width: 640px) {
          .reck-row { grid-template-columns: 24px 22px 1fr auto; }
          .reck-bar-wrap { display: none; }
          .reck-form { grid-template-columns: 1fr; }
          .reck-cols { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

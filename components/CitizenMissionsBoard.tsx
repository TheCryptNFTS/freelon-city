"use client";
import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";
import { cityNotice } from "@/lib/city-notice";

type MissionView = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  cost: number;
  rewardXp: number;
  outputKind: "ai" | "content" | "data";
  inputMode: "none" | "prompt";
  gate: { skill: string; minLevel: number };
  unlocked: boolean;
};

type Props = { citizenId: number };

export function CitizenMissionsBoard({ citizenId }: Props) {
  const h = useHolder();
  const o = useOwnsCitizen(citizenId, h.address);
  const [missions, setMissions] = useState<MissionView[] | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; body: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Load the catalog + this citizen's unlocked state once we know it's owned.
  useEffect(() => {
    if (!o.isOwner) return;
    let cancelled = false;
    fetch(`/api/citizens/${citizenId}/mission`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.missions)) setMissions(d.missions); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [o.isOwner, citizenId]);

  if (h.loading || o.loading) return null;

  const id4 = citizenId.toString().padStart(4, "0");

  if (o.error && h.address) {
    return (
      <section className="missions-board">
        <span className="kicker">⬡ HOLDER · MISSIONS · #{id4}</span>
        <p className="jobs-msg jobs-err">
          ⬡ SIGNAL DISRUPTED · the city couldn&apos;t read your chain credentials · retry
        </p>
      </section>
    );
  }

  if (!o.isOwner) return null;

  async function deploy(m: MissionView) {
    setErr(null);
    setResult(null);
    setBusy(m.id);
    const input = inputs[m.id] ?? "";

    async function post(signature?: string, address?: string) {
      return fetch(`/api/citizens/${citizenId}/mission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: m.id, input, signature, address }),
      });
    }

    try {
      let res = await post();
      if (res.status === 401) {
        const d = await res.json().catch(() => ({}));
        if (d?.error === "auth_required") {
          if (!window.ethereum) {
            setErr("No wallet detected here. Open this page in your wallet's browser, then connect — deploying a mission needs a signature.");
            setBusy(null);
            return;
          }
          if (!h.address) {
            setErr("Connect your wallet first, then try again.");
            setBusy(null);
            return;
          }
          const message = `I am deploying FREELON CITY citizen #${citizenId} on mission "${m.id}".`;
          const signature = (await window.ethereum.request({
            method: "personal_sign",
            params: [message, h.address],
          })) as string;
          res = await post(signature, h.address);
        }
      }

      const d = await res.json().catch(() => ({}));

      if (res.ok && d.ok) {
        setResult({ title: d.output.title, body: d.output.body });
        cityNotice({
          title: d.leveledUp ? `LEVEL ${d.level}` : "MISSION COMPLETE",
          body: `#${id4} · ${m.title}`,
          delta: `-${d.costBurned} ⬡`,
        });
        window.dispatchEvent(new CustomEvent("freelon:mission-complete", { detail: { citizenId, ...d } }));
        // Refresh unlocked state (a level-up may open new missions).
        fetch(`/api/citizens/${citizenId}/mission`, { cache: "no-store" })
          .then((r) => r.json())
          .then((j) => { if (Array.isArray(j.missions)) setMissions(j.missions); })
          .catch(() => {});
        setBusy(null);
        return;
      }

      // Errors.
      if (d?.error === "insufficient_hex") {
        setErr(`HEX BALANCE LOW · need ${d.required} ⬡${typeof d.balance === "number" ? `, have ${d.balance} ⬡` : ""}`);
      } else if (d?.error === "locked") {
        setErr(d.message || "This mission is locked — level the citizen up first.");
      } else if (d?.error === "mission_failed") {
        setErr(`${d.message || "Mission failed."} (Refunded ${d.refunded ?? m.cost} ⬡.)`);
      } else if (res.status === 503) {
        setErr("⬡ SIGNAL DISRUPTED · couldn't verify ownership · retry.");
      } else if (res.status === 403) {
        setErr("You no longer own this citizen.");
      } else {
        setErr(d?.error || "Couldn't deploy the mission.");
      }
    } catch (e) {
      setErr((e as Error).message || "Signature cancelled.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="missions-board">
      <span className="kicker">⬡ HOLDER · DEPLOY MISSIONS · #{id4}</span>
      <p className="jobs-sub">
        Spend ⬡ to deploy this citizen on a mission and get an output back. Missions unlock as the
        citizen levels up. Higher tiers cost more and run deeper work.
      </p>

      {missions === null ? (
        <p className="jobs-msg">Loading missions…</p>
      ) : (
        <div className="jobs-grid">
          {missions.map((m) => (
            <div className={`job-card mission-card${m.unlocked ? "" : " mission-locked"}`} key={m.id}>
              <div className="job-card-top">
                <span className="job-cat">{m.outputKind.toUpperCase()}</span>
                <span className="mission-cost">{m.cost} ⬡</span>
              </div>
              <h4 className="job-title">{m.title}</h4>
              <p className="job-desc">{m.unlocked ? m.description : m.tagline}</p>
              {m.unlocked ? (
                <>
                  {m.inputMode === "prompt" && (
                    <textarea
                      className="mission-input"
                      placeholder="Ask the citizen…"
                      maxLength={600}
                      value={inputs[m.id] ?? ""}
                      onChange={(e) => setInputs((s) => ({ ...s, [m.id]: e.target.value }))}
                    />
                  )}
                  <div className="job-reward">
                    <span>-{m.cost} ⬡</span>
                    <span>+{m.rewardXp} XP</span>
                    <span className="job-skill">{m.gate.skill}</span>
                  </div>
                  <button
                    className="btn job-btn"
                    type="button"
                    disabled={busy === m.id}
                    onClick={() => deploy(m)}
                  >
                    <span className="ttl">{busy === m.id ? "DEPLOYING…" : "DEPLOY →"}</span>
                  </button>
                </>
              ) : (
                <div className="mission-lock-note">
                  ⬡ LOCKED · Reach Level {m.gate.minLevel} ({m.gate.skill})
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="mission-result">
          <span className="kicker">⬡ {result.title}</span>
          <pre className="mission-output">{result.body}</pre>
        </div>
      )}
      {err && <p className="jobs-msg jobs-err">{err}</p>}
    </section>
  );
}

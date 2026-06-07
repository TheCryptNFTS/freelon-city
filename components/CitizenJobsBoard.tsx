"use client";
import { useState } from "react";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";
import { cityNotice } from "@/lib/city-notice";
import { JOBS, type Job } from "@/lib/jobs-catalog";

type Props = { citizenId: number };

type JobState = "idle" | "busy" | "done" | "err";

export function CitizenJobsBoard({ citizenId }: Props) {
  const h = useHolder();
  const o = useOwnsCitizen(citizenId, h.address);
  const [states, setStates] = useState<Record<string, JobState>>({});
  const [errText, setErrText] = useState<string | null>(null);

  if (h.loading || o.loading) return null;

  const id4 = citizenId.toString().padStart(4, "0");

  // RPC + OpenSea both failed — surface retry, never falsely hide from a real
  // holder (same pattern as CitizenNameEditor).
  if (o.error && h.address) {
    return (
      <section className="jobs-board">
        <span className="kicker">⬡ HOLDER · JOBS · #{id4}</span>
        <p className="jobs-msg jobs-err">
          ⬡ SIGNAL WEAK · couldn&apos;t reach the chain to load your citizens just now · wait a moment and retry. Your ownership is safe on-chain.
        </p>
      </section>
    );
  }

  // Owner-only board. Non-owners see the public CitizenProgressPanel above; the
  // work controls stay hidden so we don't add newcomer surface.
  if (!o.isOwner) return null;

  async function work(job: Job) {
    setErrText(null);
    setStates((s) => ({ ...s, [job.id]: "busy" }));

    async function post(signature?: string, address?: string) {
      return fetch(`/api/citizens/${citizenId}/job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, signature, address }),
      });
    }

    try {
      // First try the bound-session path (no signature). If the server says
      // auth_required, fall back to a one-time wallet signature.
      let res = await post();
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data?.error === "auth_required") {
          if (!window.ethereum) {
            setStates((s) => ({ ...s, [job.id]: "err" }));
            setErrText(
              "No wallet detected here. Open this page in your wallet's browser, or a desktop browser with a wallet extension, then connect — training needs a signature to prove ownership.",
            );
            return;
          }
          if (!h.address) {
            setStates((s) => ({ ...s, [job.id]: "err" }));
            setErrText("Connect your wallet first, then try again.");
            return;
          }
          const message = `I am working FREELON CITY citizen #${citizenId}'s job "${job.id}".`;
          const signature = (await window.ethereum.request({
            method: "personal_sign",
            params: [message, h.address],
          })) as string;
          res = await post(signature, h.address);
        }
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setStates((s) => ({ ...s, [job.id]: "done" }));
        cityNotice({
          title: data.leveledUp ? `LEVEL ${data.level}` : "TRAINING COMPLETE",
          body: data.leveledUp
            ? `#${id4} reached Level ${data.level}`
            : `#${id4} · ${job.title}`,
          delta: `+${data.xpGained} XP`,
        });
        window.dispatchEvent(new CustomEvent("freelon:job-complete", { detail: { citizenId, ...data } }));
        return;
      }

      if (res.ok && data.already) {
        setStates((s) => ({ ...s, [job.id]: "done" }));
        setErrText(`"${job.title}" already trained today. Resets at UTC midnight.`);
        return;
      }

      // Errors.
      setStates((s) => ({ ...s, [job.id]: "err" }));
      if (res.status === 503) {
        setErrText("⬡ SIGNAL WEAK · couldn't reach the chain to confirm ownership just now · wait a moment and retry.");
      } else if (res.status === 403) {
        setErrText("You no longer own this citizen.");
      } else {
        setErrText(data?.error || "Couldn't complete the training.");
      }
    } catch (e) {
      setStates((s) => ({ ...s, [job.id]: "err" }));
      setErrText((e as Error).message || "Signature cancelled.");
    }
  }

  return (
    <section className="jobs-board">
      <span className="kicker">⬡ HOLDER · TRAINING · #{id4}</span>
      <p className="jobs-sub">
        Each training exercise can be run once per UTC day. Completing one grows this citizen&apos;s
        level, skills, and reputation — developing it toward a specialization. Training is free.
      </p>
      <div className="jobs-grid">
        {JOBS.map((job) => {
          const st = states[job.id] ?? "idle";
          const done = st === "done";
          return (
            <div className={`job-card${done ? " job-done" : ""}`} key={job.id}>
              <div className="job-card-top">
                <span className="job-cat">{job.category}</span>
                <span className="job-diff" aria-label={`difficulty ${job.difficulty}`}>
                  {"◆".repeat(job.difficulty)}
                  <span className="job-diff-dim">{"◇".repeat(3 - job.difficulty)}</span>
                </span>
              </div>
              <h4 className="job-title">{job.title}</h4>
              <p className="job-desc">{job.description}</p>
              <div className="job-reward">
                <span>+{job.rewardXp} XP</span>
                <span className="job-skill">+1 {job.requiredSkill}</span>
              </div>
              <button
                className="btn job-btn"
                type="button"
                disabled={st === "busy" || done}
                onClick={() => work(job)}
              >
                <span className="ttl">
                  {st === "busy" ? "TRAINING…" : done ? "DONE TODAY" : "TRAIN →"}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {errText && <p className="jobs-msg jobs-err">{errText}</p>}
    </section>
  );
}

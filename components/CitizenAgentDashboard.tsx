"use client";
import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";
import { MISSION_DISCLAIMER } from "@/lib/missions/pricing";
import { openseaUrl } from "@/lib/constants";
import ShareAgentOutput from "@/components/ShareAgentOutput";
import { buildImageShareIntent } from "@/lib/share-agent";
import { trackEvent } from "@/lib/track";

type Task = { key: string; label: string };
type AbilityView = { id: string; label: string; blurb: string; skill: string; tasks: Task[]; primary: boolean; premium: boolean; hexCost: number };
type Work = { id: string; ability: string; abilityLabel: string; task: string; kind: "text" | "image"; body: string; level: number; timestamp: number };

type UnlockState = { unlocked: boolean; credits: number; tier: string; priceEth: number; rechargeEth: number; grantPerUnlock: number };
type UnlockQuote = { amountEth: string; amountWei: string; toWallet: string; expiresAt: number };
type PayStep = "idle" | "quoting" | "await" | "confirming";

type Props = { citizenId: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Starter briefs — a one-tap way to run a REAL first mission (lowers the
// blank-textarea friction). These don't grant anything; they just pre-fill an
// apt brief the owner can edit and run. Keyed by ability id.
const STARTERS: Record<string, string> = {
  content: "Write 3 punchy launch tweets for an NFT project where each piece is a trainable AI agent.",
  strategy: "My NFT mint is live but stalled at 20% sold. What do I fix first, in priority order?",
  sales: "Rewrite this landing headline to convert: 'We make AI agents.'",
  research: "Summarize the current state of the NFT market in 5 tight bullets.",
  design: "Describe a bold visual concept for a cyberpunk PFP brand — mood, palette, silhouette.",
  risk: "Red-team my plan to launch a paid AI tool with no waitlist and no audience yet.",
};

function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function CitizenAgentDashboard({ citizenId }: Props) {
  const h = useHolder();
  const o = useOwnsCitizen(citizenId, h.address);

  const [abilities, setAbilities] = useState<AbilityView[] | null>(null);
  const [paymentsLive, setPaymentsLive] = useState(false);
  const [history, setHistory] = useState<Work[]>([]);
  // Image generation (deploy-citizen): scene/style picker + its own busy/result state.
  const [scenes, setScenes] = useState<{ key: string; label: string }[]>([]);
  const [styles, setStyles] = useState<{ key: string; label: string; category: string }[]>([]);
  const [imageHexCost, setImageHexCost] = useState(0);
  const [imgBusy, setImgBusy] = useState<string | null>(null); // sceneKey while generating
  const [imgOut, setImgOut] = useState<{ url: string; label: string } | null>(null);
  const [imgErr, setImgErr] = useState<string | null>(null);
  // Video generation (deploy-video) — only shown when a provider is configured.
  const [videoStyles, setVideoStyles] = useState<{ key: string; label: string }[]>([]);
  const [videoHexCost, setVideoHexCost] = useState(0);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [vidBusy, setVidBusy] = useState<string | null>(null);
  const [vidOut, setVidOut] = useState<{ url: string; label: string } | null>(null);
  const [vidErr, setVidErr] = useState<string | null>(null);
  // Dossier (the MOAT product) — the citizen keeps a living file on the holder.
  const [dossierHexCost, setDossierHexCost] = useState(0);
  const [dossierText, setDossierText] = useState("");
  const [dossierBusy, setDossierBusy] = useState(false);
  const [dossierOut, setDossierOut] = useState<string | null>(null);
  const [dossierErr, setDossierErr] = useState<string | null>(null);
  // Crew (the "hold more than one" product) — two of your citizens collaborate.
  const [crewHexCost, setCrewHexCost] = useState(0);
  const [crewPartner, setCrewPartner] = useState("");
  const [crewBrief, setCrewBrief] = useState("");
  const [crewBusy, setCrewBusy] = useState(false);
  const [crewOut, setCrewOut] = useState<string | null>(null);
  const [crewErr, setCrewErr] = useState<string | null>(null);
  // Group transform (deploy-crew) — two of your citizens in one branded image.
  const [groupImageHexCost, setGroupImageHexCost] = useState(0);
  const [groupPartner, setGroupPartner] = useState("");
  const [groupBusy, setGroupBusy] = useState<string | null>(null); // styleKey while rendering
  const [groupOut, setGroupOut] = useState<{ url: string; label: string } | null>(null);
  const [groupErr, setGroupErr] = useState<string | null>(null);
  const [abilityId, setAbilityId] = useState<string>("");
  const [taskKey, setTaskKey] = useState<string>("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<{ kind: string; body: string; title: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState(""); // multi-turn refine instruction
  const [copied, setCopied] = useState(false);
  // Cold-visitor proof (2026-06-06): one REAL, public transform shown inline in
  // the locked gate, so a non-owner arriving from "SEE AN AGENT" sees actual
  // agent output without a wallet or spend. Same source as the homepage
  // TransformsWall (/api/transforms); self-hides when the feed is empty.
  const [exampleWork, setExampleWork] = useState<{ tokenId: number; url: string; style: string } | null>(null);

  // LIVE no-wallet demo (2026-06-06, flag-gated OFF via AGENT_DEMO_LIVE). When
  // the founder switches it on, a logged-out visitor can run ONE real agent turn
  // from a curated brief — the comprehension hook. demoBriefs stays null/empty
  // (and the whole block hides) unless the route reports live:true, so OFF is the
  // default both server- and client-side. No wallet, no spend by the visitor, no
  // writes to the citizen.
  const [demoBriefs, setDemoBriefs] = useState<{ id: string; label: string }[]>([]);
  const [demoBusy, setDemoBusy] = useState<string | null>(null); // briefId while running
  const [demoOut, setDemoOut] = useState<{ brief: string; output: string } | null>(null);
  const [demoErr, setDemoErr] = useState<string | null>(null);

  // Unlock flow (engaged when paymentsLive && a premium ability is picked on a
  // not-yet-unlocked citizen). One ETH payment → finite signal-credit pool.
  const [unlock, setUnlock] = useState<UnlockState | null>(null);
  const [payStep, setPayStep] = useState<PayStep>("idle");
  const [quote, setQuote] = useState<UnlockQuote | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [txInput, setTxInput] = useState("");
  const [payNote, setPayNote] = useState<string | null>(null);

  useEffect(() => {
    if (!o.isOwner) return;
    let cancelled = false;
    fetch(`/api/citizens/${citizenId}/agent`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !Array.isArray(d.abilities)) return;
        setAbilities(d.abilities);
        setPaymentsLive(!!d.paymentsLive);
        if (d.unlock) setUnlock(d.unlock);
        setHistory(Array.isArray(d.history) ? d.history : []);
        if (Array.isArray(d.scenes)) setScenes(d.scenes);
        if (Array.isArray(d.styles)) setStyles(d.styles);
        if (Array.isArray(d.videoStyles)) setVideoStyles(d.videoStyles);
        if (typeof d.imageHexCost === "number") setImageHexCost(d.imageHexCost);
        if (typeof d.videoHexCost === "number") setVideoHexCost(d.videoHexCost);
        if (typeof d.dossierHexCost === "number") setDossierHexCost(d.dossierHexCost);
        if (typeof d.crewHexCost === "number") setCrewHexCost(d.crewHexCost);
        if (typeof d.groupImageHexCost === "number") setGroupImageHexCost(d.groupImageHexCost);
        setVideoEnabled(!!d.videoEnabled);
        const first = d.abilities.find((a: AbilityView) => a.primary) ?? d.abilities[0];
        if (first) { setAbilityId(first.id); setTaskKey(first.tasks[0]?.key ?? ""); }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [o.isOwner, citizenId]);

  // Fetch one real example transform for the cold-visitor gate (non-owners).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/transforms", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const first = Array.isArray(d?.transforms) ? d.transforms[0] : null;
        if (first?.url) setExampleWork({ tokenId: first.tokenId, url: first.url, style: first.style });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Probe whether the LIVE no-wallet demo is switched on (AGENT_DEMO_LIVE). The
  // route returns { live:false } when off, so demoBriefs stays empty and the
  // demo block never renders. Only fetched for non-owners (the gate audience).
  useEffect(() => {
    if (o.isOwner) return;
    let cancelled = false;
    fetch(`/api/citizens/${citizenId}/demo`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.live && Array.isArray(d.briefs)) setDemoBriefs(d.briefs);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [o.isOwner, citizenId]);

  /** Run ONE curated no-wallet demo brief against the real agent. No wallet, no
   *  spend by the visitor, no writes — the server bounds cost + rate. */
  async function runDemo(briefId: string) {
    if (demoBusy) return;
    setDemoBusy(briefId); setDemoErr(null); setDemoOut(null);
    try {
      const res = await fetch(`/api/citizens/${citizenId}/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.ok && typeof d.output === "string") {
        setDemoOut({ brief: d.brief ?? "", output: d.output });
      } else {
        setDemoErr(d?.message || "The signal dropped. Try again.");
      }
    } catch {
      setDemoErr("Couldn't reach the agent. Try again.");
    } finally {
      setDemoBusy(null);
    }
  }

  /** Refetch agent state (e.g. after unlocking, to pick up credits). */
  async function refreshAgent() {
    try {
      const d = await (await fetch(`/api/citizens/${citizenId}/agent`, { cache: "no-store" })).json();
      if (d.unlock) setUnlock(d.unlock);
      if (Array.isArray(d.history)) setHistory(d.history);
    } catch { /* non-fatal */ }
  }

  if (h.loading || o.loading) {
    // Reserve the anchor so the "RUN THIS AGENT" CTA always has a target.
    return <section className="agentdash agentdash-locked" id="run" />;
  }
  if (o.error && h.address) {
    return (
      <section className="agentdash" id="run">
        <span className="kicker">⬡ THIS AGENT</span>
        <p className="agentdash-err">⬡ SIGNAL DISRUPTED · the city couldn&apos;t read the chain to check ownership · retry in a moment.</p>
      </section>
    );
  }
  // NOT THE OWNER → don't vanish (the page used to show nothing here). Show the
  // gate so there's always a visible "DO": connect the holding wallet, or buy in.
  if (!o.isOwner) {
    return (
      <section className="agentdash agentdash-locked" id="run">
        <span className="kicker">⬡ RUN THIS AGENT</span>
        {/* Real proof FIRST (2026-06-06): a non-owner sees actual agent output
            before the gate copy, so "SEE AN AGENT" pays off without a wallet.
            Self-hides when the transforms feed is empty. */}
        {exampleWork && (
          <figure className="agentdash-example">
            <figcaption className="agentdash-example-cap">⬡ EXAMPLE · real output from a FREELON agent</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={exampleWork.url}
              alt={`${exampleWork.style} — Citizen #${exampleWork.tokenId.toString().padStart(4, "0")}`}
              className="agentdash-example-img"
              loading="lazy"
              // Stored transform URLs can go dead (deleted/expired); a broken-image
              // glyph in the cold gate looks worse than nothing, so self-hide the
              // whole figure on load failure (matches the "self-hides" intent).
              onError={() => setExampleWork(null)}
            />
            <span className="agentdash-example-meta">
              &ldquo;{exampleWork.style}&rdquo; · made by Citizen #{exampleWork.tokenId.toString().padStart(4, "0")}
            </span>
          </figure>
        )}
        {/* LIVE no-wallet demo (flag-gated). Hidden entirely unless the route
            reported live:true. Lets a cold visitor watch THIS citizen reason now,
            no wallet, before any buy ask. */}
        {demoBriefs.length > 0 && (
          <div className="agentdash-demo">
            <span className="agentdash-demo-cap">⬡ TRY IT LIVE · run this agent now, no wallet</span>
            <div className="agentdash-demo-briefs">
              {demoBriefs.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="btn btn-secondary agentdash-demo-brief"
                  onClick={() => runDemo(b.id)}
                  disabled={!!demoBusy}
                >
                  {demoBusy === b.id ? "Running…" : b.label}
                </button>
              ))}
            </div>
            {demoErr && <p className="agentdash-demo-err">{demoErr}</p>}
            {demoOut && (
              <figure className="agentdash-demo-out">
                {demoOut.brief && <figcaption className="agentdash-demo-out-cap">{demoOut.brief}</figcaption>}
                <p className="agentdash-demo-out-body">{demoOut.output}</p>
                <span className="agentdash-demo-out-note">Live output · own this FREELON to keep going.</span>
              </figure>
            )}
          </div>
        )}
        {h.address ? (
          <>
            <p className="agentdash-locked-msg">
              You&apos;re connected, but this wallet doesn&apos;t hold this citizen — so you can&apos;t run its
              agent. Own it to train it and build its résumé.
            </p>
            <div className="agentdash-locked-cta">
              <a className="btn btn-primary agentdash-go" href={openseaUrl(citizenId)} target="_blank" rel="noreferrer">
                <span className="ttl">OWN THIS CITIZEN ↗</span>
              </a>
              {/* Secondary points at the live collection, not this citizen's work
                  log — that log is empty until a holder runs real jobs, so it was a
                  dead-end secondary (fixed 2026-06-06). Proof already shows inline. */}
              <a className="btn btn-secondary agentdash-go" href="/citizens">
                <span className="ttl">BROWSE ALL 4040 →</span>
              </a>
            </div>
          </>
        ) : (
          <>
            {/* Cold visitor (no wallet) lands here from "SEE AN AGENT". The proof
                pays off INLINE above (the real example output) — so the CTA is the
                next step, not a link to the per-citizen work log, which is empty for
                a citizen with no real holder activity yet (a dead-end that broke the
                "see proof" promise, 2026-06-06). Buy is the move now, with the soft
                /start landing for NFT-newcomers (mirrors the homepage buy-handoff). */}
            <p className="agentdash-locked-msg">
              {exampleWork
                ? "That's a real agent output — no wallet, no hand-editing. "
                : "FREELON agents make real work — no hand-editing. "}
              Own a FREELON and you run one yourself: transform it into any style, give it real jobs, and build a
              record only you control. New to NFTs? The 2-minute guide walks you through getting one.
            </p>
            <div className="agentdash-locked-cta">
              <a className="btn btn-primary agentdash-go" href={openseaUrl(citizenId)} target="_blank" rel="noreferrer">
                <span className="ttl">OWN A FREELON ↗</span>
              </a>
              <a className="btn btn-secondary agentdash-go" href="/start">
                <span className="ttl">NEW TO NFTS? START HERE →</span>
              </a>
            </div>
          </>
        )}
      </section>
    );
  }

  const ability = abilities?.find((a) => a.id === abilityId) ?? null;
  const premiumLive = !!ability && ability.premium && paymentsLive;
  // First-time: needs ACTIVATION. Activated-but-empty: needs RECHARGE.
  const needsActivate = premiumLive && !(unlock?.unlocked);
  const needsRecharge = premiumLive && !!unlock?.unlocked && (unlock?.credits ?? 0) <= 0;
  const needsUnlock = needsActivate || needsRecharge; // either starts the pay flow
  const payKind: "activate" | "recharge" = needsRecharge ? "recharge" : "activate";

  /** Sign the given message if the server demands wallet auth (no bound session). */
  async function signOrThrow(message: string): Promise<{ address: string; signature: string }> {
    if (!window.ethereum) throw new Error("Open this page in your wallet's browser (a signature is required).");
    if (!h.address) throw new Error("Connect your wallet first.");
    const signature = (await window.ethereum.request({ method: "personal_sign", params: [message, h.address] })) as string;
    return { address: h.address, signature };
  }

  function resetPay() {
    setPayStep("idle"); setQuote(null); setAccepted(false); setTxInput(""); setPayNote(null);
  }

  /** Run the mission. Premium runs spend a signal credit server-side; free runs
   *  just run. Handles the one-time wallet-auth signature. */
  async function doRun() {
    if (!ability || !taskKey || !brief.trim()) return;
    trackEvent("run_started", { ability: ability.id, premium: !!ability.premium });
    setBusy(true); setErr(null); setOutput(null);
    const input = `${taskKey}: ${brief.trim()}`;
    const base: Record<string, unknown> = { missionId: ability.id, input };
    try {
      let creds: { address: string; signature: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`/api/citizens/${citizenId}/mission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds ? { ...base, ...creds } : base),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 401 && d?.error === "auth_required" && !creds) {
          creds = await signOrThrow(`I am deploying FREELON CITY citizen #${citizenId} on mission "${ability.id}".`);
          continue;
        }
        finish(res, d);
        // Premium run consumed a credit → refresh the meter.
        if (ability.premium) refreshAgent();
        return;
      }
    } catch (e) {
      setErr((e as Error).message || "Couldn't run the agent.");
    } finally {
      setBusy(false);
    }
  }

  /** Generate a branded image (deploy-citizen). `key` is a scene key, or a style
   *  key when `kind="style"` (sent as "style:<key>"). Same premium pay/sign flow;
   *  costs imageHexCost ⬡. */
  async function doGenerateImage(key: string, label: string, kind: "scene" | "style" = "scene") {
    if (imgBusy) return;
    const busyId = `${kind}:${key}`;
    setImgBusy(busyId); setImgErr(null); setImgOut(null);
    const input = kind === "style" ? `style:${key}` : key;
    const base: Record<string, unknown> = { missionId: "deploy-citizen", input };
    try {
      let creds: { address: string; signature: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`/api/citizens/${citizenId}/mission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds ? { ...base, ...creds } : base),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 401 && d?.error === "auth_required" && !creds) {
          creds = await signOrThrow(`I am deploying FREELON CITY citizen #${citizenId} on mission "deploy-citizen".`);
          continue;
        }
        if (res.ok && d?.ok && d.output?.meta?.kind === "image" && d.output?.body) {
          setImgOut({ url: d.output.body, label });
          refreshAgent();
        } else {
          setImgErr(d?.message || d?.error || "Couldn't generate the image — your ⬡ was not spent on a failed render.");
        }
        return;
      }
    } catch (e) {
      setImgErr((e as Error).message || "Couldn't generate the image.");
    } finally {
      setImgBusy(null);
    }
  }

  /** Generate a short branded clip (deploy-video). Same premium pay/sign flow;
   *  input is the motion-style KEY. Costs videoHexCost ⬡ (the priciest lever). */
  async function doGenerateVideo(key: string, label: string) {
    if (vidBusy) return;
    setVidBusy(key); setVidErr(null); setVidOut(null);
    const base: Record<string, unknown> = { missionId: "deploy-video", input: key };
    try {
      let creds: { address: string; signature: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`/api/citizens/${citizenId}/mission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds ? { ...base, ...creds } : base),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 401 && d?.error === "auth_required" && !creds) {
          creds = await signOrThrow(`I am deploying FREELON CITY citizen #${citizenId} on mission "deploy-video".`);
          continue;
        }
        if (res.ok && d?.ok && d.output?.meta?.kind === "video" && d.output?.body) {
          setVidOut({ url: d.output.body, label });
          refreshAgent();
        } else {
          setVidErr(d?.message || d?.error || "Couldn't generate the clip — your ⬡ was not spent on a failed render.");
        }
        return;
      }
    } catch (e) {
      setVidErr((e as Error).message || "Couldn't generate the clip.");
    } finally {
      setVidBusy(null);
    }
  }

  /** Build/update the citizen's DOSSIER (the moat) — a persistent private file
   *  on the holder that every future mission reads from. Premium pay/sign flow;
   *  text output. The brief is the holder's private input (never shown publicly). */
  async function doDossier() {
    if (dossierBusy || !dossierText.trim()) return;
    setDossierBusy(true); setDossierErr(null); setDossierOut(null);
    const base: Record<string, unknown> = { missionId: "dossier", input: dossierText.trim() };
    try {
      let creds: { address: string; signature: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`/api/citizens/${citizenId}/mission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds ? { ...base, ...creds } : base),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 401 && d?.error === "auth_required" && !creds) {
          creds = await signOrThrow(`I am deploying FREELON CITY citizen #${citizenId} on mission "dossier".`);
          continue;
        }
        if (res.ok && d?.ok && d.output?.body) {
          setDossierOut(d.output.body);
          refreshAgent();
        } else {
          setDossierErr(d?.message || d?.error || "Couldn't update the dossier — your ⬡ was not spent on a failed run.");
        }
        return;
      }
    } catch (e) {
      setDossierErr((e as Error).message || "Couldn't update the dossier.");
    } finally {
      setDossierBusy(false);
    }
  }

  /** Run a CREW BRIEF — this citizen + another one YOU OWN collaborate on a brief.
   *  Premium pay/sign flow; input is "<partnerTokenId> <brief>". The server
   *  verifies you own the partner (a failed check refunds the ⬡). */
  async function doCrew() {
    const partner = crewPartner.trim().replace(/^#/, "");
    if (crewBusy || !/^\d{1,4}$/.test(partner) || !crewBrief.trim()) return;
    setCrewBusy(true); setCrewErr(null); setCrewOut(null);
    const base: Record<string, unknown> = { missionId: "crew", input: `${partner} ${crewBrief.trim()}` };
    try {
      let creds: { address: string; signature: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`/api/citizens/${citizenId}/mission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds ? { ...base, ...creds } : base),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 401 && d?.error === "auth_required" && !creds) {
          creds = await signOrThrow(`I am deploying FREELON CITY citizen #${citizenId} on mission "crew".`);
          continue;
        }
        if (res.ok && d?.ok && d.output?.body) {
          setCrewOut(d.output.body);
          refreshAgent();
        } else {
          setCrewErr(d?.message || d?.error || "Couldn't run the crew — your ⬡ was not spent on a failed run.");
        }
        return;
      }
    } catch (e) {
      setCrewErr((e as Error).message || "Couldn't run the crew.");
    } finally {
      setCrewBusy(false);
    }
  }

  /** GROUP TRANSFORM (deploy-crew) — render this citizen + another you OWN together
   *  in one branded style image. Premium pay/sign flow; input "<partner> <styleKey>". */
  async function doGroupTransform(styleKey: string, styleLabel: string) {
    const partner = groupPartner.trim().replace(/^#/, "");
    if (groupBusy || !/^\d{1,4}$/.test(partner)) return;
    setGroupBusy(styleKey); setGroupErr(null); setGroupOut(null);
    const base: Record<string, unknown> = { missionId: "deploy-crew", input: `${partner} ${styleKey}` };
    try {
      let creds: { address: string; signature: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`/api/citizens/${citizenId}/mission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds ? { ...base, ...creds } : base),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 401 && d?.error === "auth_required" && !creds) {
          creds = await signOrThrow(`I am deploying FREELON CITY citizen #${citizenId} on mission "deploy-crew".`);
          continue;
        }
        if (res.ok && d?.ok && d.output?.meta?.kind === "image" && d.output?.body) {
          setGroupOut({ url: d.output.body, label: styleLabel });
          refreshAgent();
        } else {
          setGroupErr(d?.message || d?.error || "Couldn't make the group transform — your ⬡ was not spent on a failed render.");
        }
        return;
      }
    } catch (e) {
      setGroupErr((e as Error).message || "Couldn't make the group transform.");
    } finally {
      setGroupBusy(null);
    }
  }

  /** Multi-turn REFINE — re-run the same ability/task with the current output as
   *  context + a refinement instruction ("make it punchier"). Costs a run like
   *  any premium job (honest — it's another model call). */
  async function doFollowUp() {
    if (!ability || !taskKey || !output || output.kind === "image" || !followUp.trim()) return;
    // Premium + activated check happens server-side; here just gate on credits UX.
    if (needsRecharge) { getUnlockQuote(); return; }
    setBusy(true); setErr(null);
    const input = `${taskKey}: ${followUp.trim()}`;
    const base: Record<string, unknown> = { missionId: ability.id, input, priorOutput: output.body };
    try {
      let creds: { address: string; signature: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`/api/citizens/${citizenId}/mission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds ? { ...base, ...creds } : base),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 401 && d?.error === "auth_required" && !creds) {
          creds = await signOrThrow(`I am deploying FREELON CITY citizen #${citizenId} on mission "${ability.id}".`);
          continue;
        }
        if (res.ok && d.ok && d.output) {
          setOutput({ kind: "text", body: d.output.body, title: d.output.title });
          setFollowUp("");
          if (ability.premium) refreshAgent();
        } else {
          setErr(d.message || d.error || "The agent couldn't refine that.");
        }
        return;
      }
    } catch (e) {
      setErr((e as Error).message || "Couldn't refine.");
    } finally {
      setBusy(false);
    }
  }

  /** Get an exact-ETH quote to ACTIVATE (one-time) or RECHARGE (refill) this agent. */
  async function getUnlockQuote() {
    setBusy(true); setErr(null); setPayNote(null); setPayStep("quoting");
    try {
      let creds: { address: string; signature: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`/api/citizens/${citizenId}/unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creds ? { action: "quote", kind: payKind, ...creds } : { action: "quote", kind: payKind }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 401 && d?.error === "auth_required" && !creds) {
          creds = await signOrThrow(`I am unlocking FREELON CITY agent #${citizenId}.`);
          continue;
        }
        if (res.ok && d.ok && !d.already) {
          setQuote({ amountEth: d.amountEth, amountWei: d.amountWei, toWallet: d.toWallet, expiresAt: d.expiresAt });
          setPayStep("await");
          return;
        }
        if (d.already) { await refreshAgent(); resetPay(); return; }
        setErr(d.message || d.error || "Couldn't get an unlock price. Try again.");
        setPayStep("idle");
        return;
      }
    } catch (e) {
      setErr((e as Error).message || "Couldn't get an unlock price.");
      setPayStep("idle");
    } finally {
      setBusy(false);
    }
  }

  /** Claim the unlock after a payment tx (polls confirmations). On success the
   *  citizen is unlocked + credited; we refresh and the run can proceed. */
  async function claimUnlock(txHash: string) {
    let creds: { address: string; signature: string } | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const res = await fetch(`/api/citizens/${citizenId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds ? { action: "claim", kind: payKind, txHash, ...creds } : { action: "claim", kind: payKind, txHash }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 401 && d?.error === "auth_required" && !creds) {
        creds = await signOrThrow(`I am unlocking FREELON CITY agent #${citizenId}.`);
        continue;
      }
      if (res.status === 425) { setPayNote("Payment received — waiting for confirmations…"); await sleep(5000); continue; }
      if (res.ok && d.ok) {
        trackEvent("activation_paid", { kind: payKind, tier: unlock?.tier ?? "unknown" });
        setPayNote(null); resetPay();
        await refreshAgent();
        setErr(null);
        return true;
      }
      setErr(d.message || d.error || "Couldn't confirm the unlock.");
      setPayStep("await"); setBusy(false);
      return false;
    }
    setErr("Still confirming on-chain. Wait a minute, then press Verify again.");
    setPayStep("await"); setBusy(false);
    return false;
  }

  /** Pay the unlock from the wallet, then claim it. */
  async function payUnlock() {
    if (!quote) return;
    if (!window.ethereum || !h.address) { setErr("Open this page in your wallet's browser to pay."); return; }
    setBusy(true); setErr(null);
    try {
      const valueHex = "0x" + BigInt(quote.amountWei).toString(16);
      const txHash = (await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: h.address, to: quote.toWallet, value: valueHex }],
      })) as string;
      setTxInput(txHash);
      setPayStep("confirming");
      setPayNote("Payment sent — unlocking your agent…");
      await claimUnlock(txHash);
    } catch (e) {
      setErr((e as Error).message || "Payment was cancelled or failed.");
      setBusy(false);
    }
  }

  /** RUN button: premium + not-unlocked + live → start the unlock flow; else run. */
  function run() {
    if (!ability || !brief.trim()) return;
    if (needsUnlock) { getUnlockQuote(); return; }
    doRun();
  }

  function finish(res: Response, d: { ok?: boolean; output?: { body: string; title: string; meta?: { kind?: string } }; already?: boolean; capacity?: boolean; message?: string; error?: string }) {
    if (res.ok && d.ok && d.output) {
      const kind = d.output.meta?.kind === "image" ? "image" : "text";
      setOutput({ kind, body: d.output.body, title: d.output.title });
      resetPay();
      // refresh history
      fetch(`/api/citizens/${citizenId}/agent`, { cache: "no-store" })
        .then((r) => r.json()).then((j) => { if (Array.isArray(j.history)) setHistory(j.history); }).catch(() => {});
      return;
    }
    if (res.ok && d.already) { setErr(d.message || "Already run for this citizen today. Resets at UTC midnight."); return; }
    if (d.capacity || res.status === 503) { setErr(d.message || "The agents are at capacity right now. Try again shortly."); return; }
    setErr(d.message || d.error || "The agent couldn't complete that.");
  }

  // The activation/recharge pay panel (quote → accept → pay). Rendered in the
  // locked hero (activate) and the run area (recharge), so it's extracted once.
  const payPanel = (
    <div className="agentdash-pay">
      <div className="agentdash-pay-hd">
        <span className="kicker">
          {payKind === "recharge"
            ? `⬡ RECHARGE · ${unlock?.tier?.toUpperCase()}`
            : `⬡ ACTIVATE YOUR AGENT · ${unlock?.tier?.toUpperCase()}`}
        </span>
        <button type="button" className="agentdash-pay-cancel" onClick={resetPay} disabled={busy}>CANCEL</button>
      </div>
      {payKind === "recharge" ? (
        <p className="agentdash-pay-note">
          Your agent is already activated — this just adds more bonus ⬡. You only pay the one-time activation once.
        </p>
      ) : (
        <p className="agentdash-pay-note">
          Activates every ability — write, strategy, research, red-team, dossier &amp; branded image generation — <strong>forever</strong>, and drops <strong>bonus ⬡</strong> in your wallet. Less than a month of ChatGPT. Activation + training history stay with the FREELON when it changes hands.
        </p>
      )}
      {payStep === "quoting" && <p className="agentdash-pay-note">Getting the price…</p>}
      {quote && (
        <>
          <div className="agentdash-pay-amount">
            <span className="agentdash-pay-eth">{quote.amountEth} ETH</span>
            <span className="agentdash-pay-usd">{payKind === "recharge" ? "refill" : "one-time · forever"} · {unlock?.tier}</span>
          </div>
          <p className="agentdash-pay-to">
            Send the <strong>exact</strong> amount to<br />
            <code>{quote.toWallet}</code>
          </p>
          <label className="agentdash-pay-accept">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>{MISSION_DISCLAIMER}</span>
          </label>
          <button
            className="btn btn-primary agentdash-go"
            type="button"
            disabled={busy || !accepted || payStep === "confirming"}
            onClick={payUnlock}
          >
            <span className="ttl">{payStep === "confirming" ? (payKind === "recharge" ? "RECHARGING…" : "ACTIVATING…") : `PAY ${quote.amountEth} ETH & ${payKind === "recharge" ? "RECHARGE" : "ACTIVATE"} →`}</span>
          </button>
          <div className="agentdash-pay-manual">
            <span className="agentdash-pay-manual-lbl">Already sent it yourself? Paste the transaction hash:</span>
            <input
              className="agentdash-pay-tx"
              placeholder="0x…"
              value={txInput}
              onChange={(e) => setTxInput(e.target.value.trim())}
              disabled={busy}
            />
            <button
              className="btn agentdash-go"
              type="button"
              disabled={busy || !accepted || !/^0x[a-fA-F0-9]{64}$/.test(txInput)}
              onClick={() => claimUnlock(txInput)}
            >
              <span className="ttl">{busy ? "VERIFYING…" : `I'VE PAID — ${payKind === "recharge" ? "RECHARGE" : "ACTIVATE"} →`}</span>
            </button>
          </div>
        </>
      )}
      {payNote && <p className="agentdash-pay-note">{payNote}</p>}
      <p className="agentdash-pay-support">
        Payments are on-chain &amp; non-refundable. Problem with a payment?{" "}
        <a href="https://x.com/4040hex" target="_blank" rel="noreferrer">DM @4040hex</a> — we&apos;ll sort it.
      </p>
    </div>
  );

  // When PAYMENTS_LIVE and the owner's citizen is LOCKED, activation is the WHOLE
  // experience — everything else is gated behind it. (Founder 2026-06-05.)
  const locked = paymentsLive && !!abilities && !unlock?.unlocked;

  return (
    <section className="agentdash" id="run">
      <div className="agentdash-hd">
        <span className="kicker">⬡ YOUR AGENT · WHAT IT CAN DO</span>
        {paymentsLive && unlock?.unlocked ? (
          <span
            className="agentdash-credits"
            title="This FREELON is unlocked. Premium abilities are paid in ⬡; earn or unlock to top up."
          >
            ⬡ UNLOCKED · PAY PER RUN IN ⬡
          </span>
        ) : (
          <span className="agentdash-note">AI-generated, review before acting</span>
        )}
      </div>

      {/* LOCKED HERO — what an owner sees when they connect to a citizen they own
          but haven't activated: a big "UNLOCK YOUR CITIZEN · <price>". Activation
          is the front door; the abilities below are a locked preview. No free demo. */}
      {locked && (
        <div className="agentdash-lockhero">
          <span className="agentdash-lockhero-eye" aria-hidden>⬡</span>
          <h3 className="agentdash-lockhero-h">UNLOCK YOUR CITIZEN</h3>
          <p className="agentdash-lockhero-sub">
            This FREELON&apos;s AI agent is sleeping. Activate it to put it to work — writing, strategy,
            research, red-team &amp; branded image generation — and it remembers everything you build together.
          </p>
          {payStep === "idle" ? (
            <>
              <div className="agentdash-lockhero-price">
                <span className="agentdash-lockhero-tier">{unlock?.tier ?? "—"}</span>
                <span className="agentdash-lockhero-eth">{unlock?.priceEth ?? "…"} ETH</span>
                <span className="agentdash-lockhero-note">one-time · activates forever · + bonus ⬡</span>
              </div>
              <button className="btn btn-primary agentdash-lockhero-cta" type="button" disabled={busy} onClick={getUnlockQuote}>
                <span className="ttl">⬡ UNLOCK · {unlock?.priceEth} ETH →</span>
              </button>
              {err && <p className="agentdash-err">{err}</p>}
            </>
          ) : payPanel}
        </div>
      )}

      {abilities === null ? (
        <p className="agentdash-loading">Loading your agent…</p>
      ) : (
        <>
          {/* Ability picker — a locked preview (dimmed, non-interactive) until the
              citizen is activated; the locked hero above drives the unlock. */}
          {locked && <span className="agentdash-lockpreview-lbl">⬡ WHAT YOU UNLOCK</span>}
          <div className={`agentdash-abilities${locked ? " is-locked" : ""}`} aria-hidden={locked}>
            {abilities.map((a) => (
              <button
                key={a.id}
                type="button"
                tabIndex={locked ? -1 : 0}
                className={`agentdash-ability${a.id === abilityId ? " is-active" : ""}${a.primary ? " is-primary" : ""}`}
                onClick={() => { if (locked) return; setAbilityId(a.id); setTaskKey(a.tasks[0]?.key ?? ""); setOutput(null); setErr(null); resetPay(); }}
              >
                <span className="agentdash-ability-name">
                  {a.label}{a.primary ? " ★" : ""}
                  {paymentsLive && a.premium
                    ? (unlock?.unlocked
                        ? <span className={`agentdash-ability-price${a.hexCost > 0 ? "" : " is-free"}`}>{a.hexCost > 0 ? `${a.hexCost.toLocaleString()}⬡` : "FREE"}</span>
                        : <span className="agentdash-ability-price">UNLOCK</span>)
                    : <span className="agentdash-ability-price is-free">FREE</span>}
                </span>
                <span className="agentdash-ability-blurb">{a.blurb}</span>
              </button>
            ))}
          </div>

          {/* WELCOME BACK — the relationship moment. If this agent has done work
              before and the box is empty, invite the holder to continue the last
              thread (pre-selects that ability + primes the brief). This is what
              makes it feel like a colleague who remembers, not a fresh chatbot. */}
          {!locked && history.length > 0 && !brief.trim() && payStep === "idle" && (() => {
            const last = history[0];
            const a = abilities?.find((x) => x.id === last.ability);
            if (!a) return null;
            return (
              <button
                type="button"
                className="agentdash-resume"
                onClick={() => {
                  setAbilityId(a.id);
                  setTaskKey(a.tasks.find((t) => t.key === last.task)?.key ?? a.tasks[0]?.key ?? "");
                  setBrief(`Continue from my last ${last.abilityLabel}: `);
                  setOutput(null); setErr(null); resetPay();
                }}
              >
                ⬡ Welcome back — pick up where you left off · continue your last {last.abilityLabel}
              </button>
            );
          })()}

          {/* Task + brief — hidden when locked; activation happens in the hero. */}
          {ability && !locked && (
            <div className="agentdash-run">
              <div className="agentdash-tasks">
                {ability.tasks.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`agentdash-task${t.key === taskKey ? " is-active" : ""}`}
                    onClick={() => setTaskKey(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                className="agentdash-brief"
                placeholder={`Tell your ${ability.label} what to do…`}
                maxLength={600}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                disabled={payStep !== "idle"}
              />

              {payStep === "idle" && !brief.trim() && STARTERS[ability.id] && (
                <button
                  type="button"
                  className="agentdash-starter"
                  onClick={() => setBrief(STARTERS[ability.id])}
                >
                  ⬡ Try a starter brief — “{STARTERS[ability.id].slice(0, 52)}…”
                </button>
              )}

              {payStep === "idle" ? (
                <button className="btn btn-primary agentdash-go" type="button" disabled={busy || !brief.trim()} onClick={run}>
                  <span className="ttl">
                    {busy ? "WORKING…"
                      : needsActivate ? `ACTIVATE TO RUN ${ability.label.toUpperCase()} →`
                      : needsRecharge ? `RECHARGE TO RUN →`
                      : `RUN ${ability.label.toUpperCase()} →`}
                  </span>
                </button>
              ) : payPanel}
            </div>
          )}

          {err && (
            <p className="agentdash-err">
              {err}
              {" "}
              <a href="https://x.com/4040hex" target="_blank" rel="noreferrer" className="agentdash-support">
                Stuck after paying? DM @4040hex →
              </a>
            </p>
          )}

          {output && (
            <div className="agentdash-output">
              <span className="agentdash-output-hd">{output.title}</span>
              {output.kind === "image"
                ? <img src={output.body} alt="agent output" className="agentdash-img" />
                : <pre className="agentdash-text">{output.body}</pre>}

              {/* Output actions: copy · share · (text only) refine */}
              <div className="agentdash-output-actions">
                {output.kind !== "image" && (
                  <button
                    type="button"
                    className="agentdash-outbtn"
                    onClick={() => { navigator.clipboard?.writeText(output.body).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
                  >
                    {copied ? "COPIED ✓" : "COPY"}
                  </button>
                )}
                <ShareAgentOutput
                  tokenId={citizenId}
                  citizenName={`Citizen #${citizenId.toString().padStart(4, "0")}`}
                  abilityLabel={ability?.label ?? "AGENT"}
                  className="agentdash-outbtn"
                />
              </div>

              {/* Multi-turn refine (text outputs only) */}
              {output.kind !== "image" && (
                <div className="agentdash-followup">
                  <input
                    className="agentdash-followup-input"
                    placeholder="Refine it — e.g. “make it punchier”, “shorter”, “more aggressive”…"
                    value={followUp}
                    maxLength={200}
                    onChange={(e) => setFollowUp(e.target.value)}
                    disabled={busy}
                    onKeyDown={(e) => { if (e.key === "Enter" && followUp.trim()) doFollowUp(); }}
                  />
                  <button
                    type="button"
                    className="btn agentdash-outbtn agentdash-followup-go"
                    disabled={busy || !followUp.trim()}
                    onClick={doFollowUp}
                  >
                    {busy ? "…" : "REFINE →"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GENERATE IMAGE — branded scene render (deploy-citizen). Shown when the
              agent is unlocked (or in free test mode). Each render is signed +
              HEX-priced like any premium run, hosted on Blob, and stamped with the
              FREELON signature (free marketing when shared). */}
          {(scenes.length > 0 || styles.length > 0) && (!paymentsLive || unlock?.unlocked) && (
            <div className="agentdash-images">
              <span className="agentdash-images-hd">
                ⬡ IMAGE STUDIO{paymentsLive && imageHexCost > 0 ? ` · ${imageHexCost.toLocaleString()}⬡ EACH` : ""}
              </span>
              <p className="agentdash-images-sub">Render your FREELON — every image is branded + ready to share.</p>

              {styles.length > 0 && (
                <>
                  <span className="agentdash-images-grp">TRANSFORMS</span>
                  <div className="agentdash-scenes">
                    {styles.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        className="agentdash-scene"
                        disabled={!!imgBusy}
                        onClick={() => doGenerateImage(s.key, s.label, "style")}
                      >
                        {imgBusy === `style:${s.key}` ? "Rendering…" : s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {scenes.length > 0 && (
                <>
                  <span className="agentdash-images-grp">SCENES</span>
                  <div className="agentdash-scenes">
                    {scenes.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        className="agentdash-scene"
                        disabled={!!imgBusy}
                        onClick={() => doGenerateImage(s.key, s.label, "scene")}
                      >
                        {imgBusy === `scene:${s.key}` ? "Rendering…" : s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {imgErr && <p className="agentdash-err">{imgErr}</p>}
              {imgOut && (
                <div className="agentdash-image-out">
                  <span className="agentdash-image-cap">{imgOut.label}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgOut.url} alt={imgOut.label} className="agentdash-image-img" />
                  <div className="agentdash-image-actions">
                    <button
                      type="button"
                      className="btn btn-primary agentdash-outbtn"
                      onClick={() => window.open(buildImageShareIntent({ tokenId: citizenId, styleLabel: imgOut.label, imageUrl: imgOut.url }), "_blank", "noopener,noreferrer")}
                    >⬡ SHARE ON X →</button>
                    <a className="btn agentdash-outbtn" href={imgOut.url} target="_blank" rel="noreferrer">OPEN FULL SIZE ↗</a>
                  </div>
                </div>
              )}

              {/* VIDEO — premium tier, only when a provider is configured. */}
              {videoEnabled && videoStyles.length > 0 && (
                <>
                  <span className="agentdash-images-grp">ANIMATE{paymentsLive && videoHexCost > 0 ? ` · ${videoHexCost.toLocaleString()}⬡` : ""}</span>
                  <div className="agentdash-scenes">
                    {videoStyles.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        className="agentdash-scene"
                        disabled={!!vidBusy}
                        onClick={() => doGenerateVideo(v.key, v.label)}
                      >
                        {vidBusy === v.key ? "Rendering… (~1 min)" : `▶ ${v.label}`}
                      </button>
                    ))}
                  </div>
                  {vidErr && <p className="agentdash-err">{vidErr}</p>}
                  {vidOut && (
                    <div className="agentdash-image-out">
                      <span className="agentdash-image-cap">{vidOut.label}</span>
                      <video src={vidOut.url} className="agentdash-image-img" controls loop autoPlay muted playsInline />
                      <a className="btn agentdash-outbtn" href={vidOut.url} target="_blank" rel="noreferrer">OPEN CLIP ↗</a>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* DOSSIER — the moat. Moved BELOW the image studio (2026-06-06): a
              freshly-unlocked owner should hit the fun, instant transform first,
              not a "write about yourself" textarea. The memory is what makes it
              compound, so it sits right under the studio as the deeper next step. */}
          {(!paymentsLive || unlock?.unlocked) && (
            <div className="agentdash-dossier">
              <span className="agentdash-images-hd">
                ⬡ CITIZEN DOSSIER{paymentsLive && dossierHexCost > 0 ? ` · ${dossierHexCost.toLocaleString()}⬡` : ""}
              </span>
              <p className="agentdash-images-sub">
                Tell your citizen about you &amp; your project. It keeps a private file and reads it on every
                future job — so it becomes <em>your</em> specialist, not a generic chatbot.
              </p>
              <textarea
                className="agentdash-brief"
                rows={4}
                placeholder="Who you are, what you're building, your audience, your voice, what 'good' looks like…"
                value={dossierText}
                onChange={(e) => setDossierText(e.target.value)}
                disabled={dossierBusy}
              />
              <button
                className="btn btn-primary agentdash-go"
                type="button"
                disabled={dossierBusy || !dossierText.trim()}
                onClick={doDossier}
              >
                <span className="ttl">{dossierBusy ? "SAVING TO MEMORY…" : "⬡ UPDATE DOSSIER →"}</span>
              </button>
              {dossierErr && <p className="agentdash-err">{dossierErr}</p>}
              {dossierOut && (
                <div className="agentdash-image-out">
                  <span className="agentdash-image-cap">WHAT YOUR CITIZEN NOW KNOWS</span>
                  <pre className="agentdash-text">{dossierOut}</pre>
                </div>
              )}
            </div>
          )}

          {/* CREW — the "hold more than one" job. This citizen + another you OWN
              collaborate on one brief, each from its class. Server verifies you
              hold the partner (a failed check refunds the ⬡). */}
          {(!paymentsLive || unlock?.unlocked) && (
            <div className="agentdash-dossier">
              <span className="agentdash-images-hd">
                ⬡ RUN A CREW{paymentsLive && crewHexCost > 0 ? ` · ${crewHexCost.toLocaleString()}⬡` : ""}
              </span>
              <p className="agentdash-images-sub">
                Team this citizen with <em>another FREELON you own</em> — they work one brief together, each
                from its specialty. A crew does what one agent can&apos;t.
              </p>
              <input
                className="agentdash-brief"
                type="text"
                inputMode="numeric"
                placeholder="Partner token # (a FREELON you own, e.g. 404)"
                value={crewPartner}
                onChange={(e) => setCrewPartner(e.target.value)}
                disabled={crewBusy}
                style={{ marginBottom: 8 }}
              />
              <textarea
                className="agentdash-brief"
                rows={3}
                placeholder="The brief for the two of them — e.g. 'design a 3-step welcome flow for my app'"
                value={crewBrief}
                onChange={(e) => setCrewBrief(e.target.value)}
                disabled={crewBusy}
              />
              <button
                className="btn btn-primary agentdash-go"
                type="button"
                disabled={crewBusy || !/^#?\d{1,4}$/.test(crewPartner.trim()) || !crewBrief.trim()}
                onClick={doCrew}
              >
                <span className="ttl">{crewBusy ? "ASSEMBLING CREW…" : "⬡ RUN CREW →"}</span>
              </button>
              {crewErr && <p className="agentdash-err">{crewErr}</p>}
              {crewOut && (
                <div className="agentdash-image-out">
                  <span className="agentdash-image-cap">CREW OUTPUT</span>
                  <pre className="agentdash-text">{crewOut}</pre>
                </div>
              )}
            </div>
          )}

          {/* GROUP TRANSFORM (deploy-crew) — two of your citizens in one branded
              image. Owned-only + premium-priced. Shown when styles are available. */}
          {styles.length > 0 && (!paymentsLive || unlock?.unlocked) && (
            <div className="agentdash-images">
              <span className="agentdash-images-hd">
                ⬡ GROUP TRANSFORM{paymentsLive && groupImageHexCost > 0 ? ` · ${groupImageHexCost.toLocaleString()}⬡ EACH` : ""}
              </span>
              <p className="agentdash-images-sub">
                Put this citizen and <em>another FREELON you own</em> in one branded image — pick a style.
              </p>
              <input
                className="agentdash-brief"
                type="text"
                inputMode="numeric"
                placeholder="Partner token # (a FREELON you own, e.g. 404)"
                value={groupPartner}
                onChange={(e) => setGroupPartner(e.target.value)}
                disabled={!!groupBusy}
                style={{ marginBottom: 8 }}
              />
              <div className="agentdash-scenes">
                {styles.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className="agentdash-scene"
                    disabled={!!groupBusy || !/^#?\d{1,4}$/.test(groupPartner.trim())}
                    onClick={() => doGroupTransform(s.key, s.label)}
                  >
                    {groupBusy === s.key ? "Rendering…" : s.label}
                  </button>
                ))}
              </div>
              {groupErr && <p className="agentdash-err">{groupErr}</p>}
              {groupOut && (
                <div className="agentdash-image-out">
                  <span className="agentdash-image-cap">{groupOut.label}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={groupOut.url} alt={groupOut.label} className="agentdash-image-img" />
                  <div className="agentdash-image-actions">
                    <button
                      type="button"
                      className="btn btn-primary agentdash-outbtn"
                      onClick={() => window.open(buildImageShareIntent({ tokenId: citizenId, styleLabel: groupOut.label, imageUrl: groupOut.url }), "_blank", "noopener,noreferrer")}
                    >⬡ SHARE ON X →</button>
                    <a className="btn agentdash-outbtn" href={groupOut.url} target="_blank" rel="noreferrer">OPEN FULL SIZE ↗</a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Body of work */}
          {history.length > 0 && (
            <div className="agentdash-history">
              <span className="agentdash-history-hd">BODY OF WORK · {history.length}</span>
              <ul>
                {history.slice(0, 6).map((w) => (
                  <li key={w.id}>
                    <span className="aw-when">{ago(w.timestamp)}</span>
                    <span className="aw-tag">{w.abilityLabel}/{w.task}</span>
                    <span className="aw-body">{w.kind === "image" ? "⬡ image" : w.body.slice(0, 80)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

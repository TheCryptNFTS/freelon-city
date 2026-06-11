"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FramedAgent } from "./FramedAgent";
import { HonoraryDisclaimer } from "./HonoraryDisclaimer";
import { WorkspaceUnlock } from "./WorkspaceUnlock";
import { AgentPowers } from "./AgentPowers";
import { CitizenJobsBoard } from "./CitizenJobsBoard";
import { LevelUpCelebration } from "./LevelUpCelebration";
import { DispatchPanel } from "./DispatchPanel";
import { cityNotice } from "@/lib/city-notice";
import { proveWallet } from "@/lib/wallet-proof";
import { resolveCityDestinations, type CityLink } from "@/lib/city-destinations";
import { ThinkingVerb } from "./ThinkingVerb";
import tv from "./ThinkingVerb.module.css";
import styles from "./AgentWorkspace.module.css";
import layout from "./WorkspaceLayout.module.css";
import presence from "./Presence.module.css";

/* ──────────────────────────────────────────────────────────────────────────
 * AGENT WORKSPACE — the ChatGPT/Claude-style home for ONE citizen-agent.
 *
 * A holder clicks their citizen and lands here: ONE centered chat column
 * (~720px, composer pinned at bottom) under a slim header — the Book's
 * chat-first collapse (2026-06). Threads live in a ☰ drawer (hidden at all
 * widths until opened); the citizen's level, ⬡ balance, unlock status, agent
 * powers, dispatch, gallery and durable work history live under the single
 * "ADVANCED · TOOLS & RECORDS" fold between the chat and the composer.
 *
 * It reuses the LIVE backend untouched:
 *   - GET  /api/citizens/[id]/agent            → abilities, scenes, unlock, history
 *   - POST /api/citizens/[id]/mission          → run a text/image job
 *   - GET  /api/wallet/[address]/hex           → ⬡ balance
 * Threads are the conversational layer. They live in localStorage by default
 * (instant, no-wallet), and a holder can opt into a wallet-signed server BACKUP
 * (/api/threads) so their chats survive a browser clear / new device and follow
 * the wallet across devices — private to that wallet, never leaked on resale.
 * The durable per-NFT record (history, dossier, images, level) already lives
 * server-side and is shown in the right pane. Signatures are cached per ability,
 * since the signed message names the mission, so a holder signs once per
 * ability, not per message.
 * ────────────────────────────────────────────────────────────────────────── */

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
function eth(): Eth | null {
  return typeof window !== "undefined" ? ((window as unknown as { ethereum?: Eth }).ethereum ?? null) : null;
}

type AbilityView = {
  id: string;
  label: string;
  blurb: string;
  skill: string;
  primary?: boolean;
  premium?: boolean;
  hexCost?: number;
  tasks: { key: string; label: string }[];
};
type Scene = { key: string; label: string };
type Unlock = { unlocked: boolean; credits: number; tier: string; priceEth?: number; grantPerUnlock?: number };
type WorkItem = { id: string; ability?: string; abilityLabel?: string; task?: string; kind: "text" | "image"; body: string; level?: number; timestamp: number };
type AgentData = {
  level: number;
  className: string;
  classCapability?: string;
  paymentsLive: boolean;
  unlock: Unlock;
  abilities: AbilityView[];
  scenes: Scene[];
  /** Reveal forms of this token's art (reference-art picker; length 1 = no picker). */
  forms?: { key: string; label: string; refUrl: string }[];
  imageHexCost?: number;
  history: WorkItem[];
};

type Msg = {
  id: string;
  role: "user" | "agent" | "system";
  kind: "text" | "image";
  text?: string;
  imageUrl?: string;
  abilityLabel?: string;
  /** City-assistant link cards surfaced from the allowlist (navigation/help). */
  links?: CityLink[];
  error?: boolean;
  ts: number;
};
type Thread = { id: string; title: string; createdAt: number; updatedAt: number; messages: Msg[] };

/** Owner-scoped on-chain grounding from /api/citizens/[id]/landing. Every field
 *  is independently nullable — the server omits anything it couldn't confirm,
 *  and the greeting only renders clauses for the facts that are present. */
type Landing = {
  isOwner: boolean;
  daysHeld: number | null;
  lastSaleEth: number | null;
  lastSaleTs: number | null;
  level: number | null;
  className: string | null;
  jobsDone: number | null;
  rank: number | null;
  otherHeld: number | null;
};

type Props = {
  tokenId: number;
  name: string;
  art: string;
  tier: string;
  civName: string;
  /** Civilization SLUG (e.g. "red-corruption") — needed to publish a render to
   *  the City Archive (POST /api/transmissions validates against civ slugs).
   *  FREELONS only; sisters have no city civ. */
  civSlug?: string;
  doctrine: string;
  color: string;
  headline: string | null;
  /** Sister-collection slug. Omitted/"freelons" → the flagship FREELONS agent
   *  (rich abilities/images/unlock). Any other agentic slug → a sister agent
   *  (chat-only, free) served by /api/agents/[slug]/[id]. */
  slug?: string;
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Per-collection flavour for the CREATE action — same simple UI, different
 *  world flavour (multi-collection: FREELONS aren't the only citizens). Keyed
 *  by sister slug; FREELONS (slug null) uses the default. */
function createFlavour(slug: string | null): { noun: string; line: string } {
  if (!slug) return { noun: "CHARACTER", line: "Create a city transmission — a branded, shareable scene of your citizen, saved to its record." };
  if (slug.includes("crypt-official") || slug === "the-crypt-official")
    return { noun: "DEAD SIGNAL", line: "Recover a dead signal — a cinematic archive record, saved to its history." };
  if (slug.includes("oogie")) return { noun: "LIFEFORM", line: "File a mutation sighting — a cinematic creature record, saved to its history." };
  if (slug.includes("emile")) return { noun: "MEMORY", line: "Surface a memory fragment — a cinematic scene, saved to its record." };
  if (slug.includes("smile")) return { noun: "SIGNAL", line: "Issue a collapse report — a cinematic warning scene, saved to its record." };
  return { noun: "CHARACTER", line: "Create a cinematic scene with this character, saved to its record." };
}

/** Cached signatures stay valid for this long before we transparently re-sign
 *  (replay-protection window — matches the server's accept window). */
const SIG_WINDOW_MS = 30 * 60 * 1000;

/** Union two thread lists by id; the newer updatedAt wins. Used to merge the
 *  server backup with whatever is on this device so a holder who chatted on
 *  another device sees both, newest first. */
function mergeThreads(a: Thread[], b: Thread[]): Thread[] {
  const byId = new Map<string, Thread>();
  for (const t of [...a, ...b]) {
    const ex = byId.get(t.id);
    if (!ex || (t.updatedAt ?? 0) > (ex.updatedAt ?? 0)) byId.set(t.id, t);
  }
  return Array.from(byId.values()).sort((x, y) => (y.updatedAt ?? 0) - (x.updatedAt ?? 0));
}

export function AgentWorkspace(props: Props) {
  const { tokenId, name, art, tier, civName, civSlug, color } = props;
  const id4 = String(tokenId).padStart(4, "0");
  // Sister collections (any agentic slug ≠ freelons) are served by a separate,
  // shape-compatible endpoint and namespace their local threads by slug so they
  // never collide with a FREELONS citizen of the same tokenId.
  const slug = props.slug && props.slug !== "freelons" ? props.slug : null;
  const subjectKey = slug ? `${slug}:${tokenId}` : `${tokenId}`;
  const agentUrl = slug ? `/api/agents/${slug}/${tokenId}` : `/api/citizens/${tokenId}/agent`;
  const missionUrl = slug ? `/api/agents/${slug}/${tokenId}` : `/api/citizens/${tokenId}/mission`;
  const threadsKey = `freelon:ws:threads:${subjectKey}`;
  const activeKey = `freelon:ws:active:${subjectKey}`;

  const [address, setAddress] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [hex, setHex] = useState<number | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [sending, setSending] = useState(false);
  // True while a run is blocked waiting on the wallet signature popup (proof
  // expired / fresh device). Drives "Waiting for your wallet signature…" copy so
  // a pending signature never masquerades as a stuck "Rendering…" spinner.
  const [awaitingSig, setAwaitingSig] = useState(false);
  const [composer, setComposer] = useState("");
  const [mode, setMode] = useState<"chat" | "image">("chat");
  const [abilityId, setAbilityId] = useState<string>("");
  const [taskKey, setTaskKey] = useState<string>("");
  const [sceneKey, setSceneKey] = useState<string>("");
  // Which reveal form of the citizen the render references — only the ~1900
  // geometric-regen tokens have a second option (figurative = site canon).
  const [formKey, setFormKey] = useState<string>("figurative");
  // Image scene picker collapses to a compact "Scene · {selected} · change" bar
  // so all 32 chips don't stay sprawled across the composer during/after a render.
  const [scenesOpen, setScenesOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  // CITY CREATION LOOP (Prompt step 1): publish a just-rendered image to the City
  // Archive (/transmissions). Reuses the existing POST /api/transmissions (which
  // walletProof-gates + burns the existing submission cost). FREELONS only (needs
  // a civ slug; sisters have no city civ). Flag-gated via NEXT_PUBLIC_CREATE_PUBLISH_LIVE.
  const publishLive = process.env.NEXT_PUBLIC_CREATE_PUBLISH_LIVE !== "false";
  const canPublish = publishLive && !slug && !!civSlug;
  const [publishState, setPublishState] = useState<Record<string, "idle" | "busy" | "done" | "error">>({});
  const [syncState, setSyncState] = useState<"off" | "syncing" | "on" | "error">("off");
  // Which Agent Power is open in the lobby. Lifted here so the always-visible
  // info-pane entry can deep-link to a specific power (returning to the lobby).
  const [powersTab, setPowersTab] = useState<"none" | "transmission" | "chronicle" | "versus">("none");
  const [levelUp, setLevelUp] = useState<number | null>(null);
  // THE LANDING PAD — on-chain facts only THIS holder + THIS citizen could
  // produce, fetched once the wallet is known. Fail-quiet: a null payload (slow
  // RPC / non-owner / sister) just hides the grounding line, never blocks chat.
  const [landing, setLanding] = useState<Landing | null>(null);
  // Owner-only FULL history (incl. raw text body) from the signature-gated
  // /history/full endpoint (Build Sequence Prompt 8). The public agent fetch
  // supplies everything else; this overlays ONLY the work-history body for the
  // proven owner. null = not loaded / not a proven owner → UI falls back to the
  // public history. Kept separate from `agent` so loadAgent/poll refreshes never
  // clobber it and we never trigger a setAgent loop.
  const [ownerHistory, setOwnerHistory] = useState<WorkItem[] | null>(null);

  const sigCache = useRef<Record<string, { signature: string; ts: number }>>({});
  const syncSig = useRef<{ signature: string; ts: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // Clicking a "what this agent does" starter should DO something visible — it
  // selects the ability + chat mode, then focuses the composer so the holder
  // sees the next step (type a brief) instead of a silent no-op. (Discord:
  // "I click on things and nothing happens.")
  function pickStarter(abilityId: string) {
    setMode("chat");
    setAbilityId(abilityId);
    setTimeout(() => composerRef.current?.focus({ preventScroll: false }), 40);
  }

  /* ── Load saved threads ──────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(threadsKey);
      const saved: Thread[] = raw ? JSON.parse(raw) : [];
      if (saved.length) {
        setThreads(saved);
        const a = localStorage.getItem(activeKey);
        setActiveId(a && saved.some((t) => t.id === a) ? a : saved[0].id);
      } else {
        const t: Thread = { id: uid(), title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
        setThreads([t]);
        setActiveId(t.id);
      }
    } catch {
      const t: Thread = { id: uid(), title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
      setThreads([t]);
      setActiveId(t.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Persist threads ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (threads.length) {
      try { localStorage.setItem(threadsKey, JSON.stringify(threads)); } catch {}
    }
  }, [threads, threadsKey]);
  useEffect(() => {
    if (activeId) { try { localStorage.setItem(activeKey, activeId); } catch {} }
  }, [activeId, activeKey]);

  /* ── Cross-device thread sync (opt-in, wallet-signed) ────────────────────
   * localStorage is the always-on default. This is the DURABLE backup: a
   * holder signs once to back their chats up to their wallet, so they survive
   * a browser clear / new device and follow the wallet across devices. The
   * blob is private to the wallet (signature-gated server-side), so it never
   * leaks to the next owner on a resale. Signature is timestamp-bound + cached,
   * so an active session signs ~once per 30 min, not per save. */
  async function signSync(): Promise<{ address: string; signature: string; ts: number } | null> {
    const e = eth();
    if (!e || !address) return null;
    const now = Date.now();
    if (syncSig.current && now - syncSig.current.ts < SIG_WINDOW_MS) {
      return { address, signature: syncSig.current.signature, ts: syncSig.current.ts };
    }
    const ts = now;
    const message = `Sync my FREELON workspace threads for ${subjectKey} at ${ts}.`;
    const signature = (await e.request({ method: "personal_sign", params: [message, address] })) as string;
    syncSig.current = { signature, ts };
    return { address, signature, ts };
  }
  async function enableSync() {
    if (!address) { connect(); return; }
    setSyncState("syncing");
    try {
      const creds = await signSync();
      if (!creds) { setSyncState("error"); return; }
      const q = new URLSearchParams({ subject: subjectKey, address: creds.address, signature: creds.signature, ts: String(creds.ts) });
      const res = await fetch(`/api/threads?${q.toString()}`);
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.ok && d.blob && Array.isArray(d.blob.threads)) {
        setThreads((local) => mergeThreads(local, d.blob.threads as Thread[]));
      }
      setSyncState("on");
    } catch {
      setSyncState("error");
    }
  }
  // Auto-save (debounced) once sync is enabled. Reuses the cached signature, so
  // no popup per save.
  useEffect(() => {
    if (syncState !== "on" || !address || !threads.length) return;
    const h = setTimeout(async () => {
      try {
        const creds = await signSync();
        if (!creds) return;
        await fetch("/api/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: subjectKey, address: creds.address, signature: creds.signature, ts: creds.ts, threads, activeId }),
        });
      } catch {/* keep local copy regardless */}
    }, 1500);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, activeId, syncState, address, subjectKey]);

  /* ── Load agent data (public) ────────────────────────────────────────── */
  const loadAgent = useCallback(async () => {
    try {
      const res = await fetch(agentUrl);
      const d: AgentData = await res.json();
      setAgent(d);
      setAbilityId((prev) => prev || d.abilities.find((a) => a.primary)?.id || d.abilities[0]?.id || "");
      setSceneKey((prev) => prev || d.scenes[0]?.key || "");
    } catch {/* keep UI usable */}
  }, [agentUrl]);
  useEffect(() => { loadAgent(); }, [loadAgent]);

  /* ── Recover a lost image render ─────────────────────────────────────────
   * deploy-citizen writes the image to history BEFORE it replies, so on a
   * flaky mobile connection the render can SUCCEED server-side while the
   * client's fetch drops. Poll the agent's history for an image URL we didn't
   * have before the attempt; return it so the chat can show it instead of a
   * false "render failed". Bounded polls (the render is usually done in ~15s). */
  const pollForNewImage = useCallback(async (knownBefore: Set<string>): Promise<string | null> => {
    // ~90s of polling: covers a slow render (image model + signature stamp +
    // Blob upload can run 20-40s) plus mobile network lag, comfortably under the
    // route's 300s ceiling. First check is quick (fast renders land in ~10s).
    const delays = [3000, 4000, 5000, 5000, 6000, 6000, 7000, 7000, 8000, 8000, 8000, 8000];
    for (const wait of delays) {
      await new Promise((r) => setTimeout(r, wait));
      try {
        const res = await fetch(agentUrl, { cache: "no-store" });
        const d: AgentData = await res.json();
        const fresh = (d.history ?? []).filter((h) => h.kind === "image" && h.body && !knownBefore.has(h.body));
        if (fresh.length) {
          fresh.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)); // newest first
          setAgent(d); // refresh gallery/level too
          return fresh[0].body;
        }
      } catch {/* keep polling */}
    }
    return null;
  }, [agentUrl]);

  /* ── Default task when ability changes ───────────────────────────────── */
  useEffect(() => {
    const ab = agent?.abilities.find((a) => a.id === abilityId);
    if (ab) setTaskKey((prev) => (ab.tasks.some((t) => t.key === prev) ? prev : ab.tasks[0]?.key || ""));
  }, [abilityId, agent]);

  /* ── Wallet connect + balance ────────────────────────────────────────── */
  const loadHex = useCallback(async (addr: string) => {
    try {
      const res = await fetch(`/api/wallet/${addr}/hex`);
      const d = await res.json();
      if (typeof d.balance === "number") setHex(d.balance);
    } catch {}
  }, []);
  const connect = useCallback(async () => {
    const e = eth();
    if (!e) { alert("Open this page in a wallet browser (MetaMask, Rainbow, etc.) to connect."); return; }
    try {
      const accts = (await e.request({ method: "eth_requestAccounts" })) as string[];
      const a = accts?.[0]?.toLowerCase();
      if (a) { setAddress(a); loadHex(a); }
    } catch {/* user rejected */}
  }, [loadHex]);
  useEffect(() => {
    const e = eth();
    if (!e) return;
    e.request({ method: "eth_accounts" }).then((accts) => {
      const a = (accts as string[])?.[0]?.toLowerCase();
      if (a) { setAddress(a); loadHex(a); }
    }).catch(() => {});
  }, [loadHex]);

  /* ── Landing pad: on-chain grounding for session 1 ───────────────────────
   * Once the wallet is connected (FREELONS only — sisters have no on-chain
   * progression/sale history wired here), pull the facts only this holder +
   * this citizen could know. The server confirms ownership before returning
   * holder-scoped data; we just render whatever it confirmed. Fail-quiet. */
  useEffect(() => {
    if (slug || !address) { setLanding(null); return; }
    let cancelled = false;
    fetch(`/api/citizens/${tokenId}/landing?address=${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Landing | null) => { if (!cancelled && d && d.isOwner) setLanding(d); })
      .catch(() => {/* hide the line, never block */});
    return () => { cancelled = true; };
  }, [slug, address, tokenId]);

  /* ── Owner full-history overlay (Prompt 8) ───────────────────────────────
   * For the PROVEN owner only, pull the full work history (incl. raw text body)
   * from the signature-gated /history/full endpoint. The public agent endpoint
   * still carries body today (stripped in a later prompt); once it's stripped,
   * THIS is what keeps the owner's memory visible. Fail-quiet: a 401
   * (bound-but-unsigned) / 403 / network error leaves ownerHistory null and the
   * UI falls back to the public history — never blank, never an error, never a
   * forced signature popup. Re-runs when the public history grows (new work) so
   * the owner's view stays fresh. FREELONS only. */
  useEffect(() => {
    if (slug || !address || !landing?.isOwner) { setOwnerHistory(null); return; }
    let cancelled = false;
    fetch(`/api/citizens/${tokenId}/history/full?address=${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { history?: WorkItem[] } | null) => {
        if (!cancelled && d && Array.isArray(d.history)) setOwnerHistory(d.history);
      })
      .catch(() => {/* fall back to public history, never block */});
    return () => { cancelled = true; };
  }, [slug, address, tokenId, landing?.isOwner, agent?.history?.length]);

  /* ── Scroll to newest ────────────────────────────────────────────────── */
  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages.length, sending]);

  /* ── Thread helpers ──────────────────────────────────────────────────── */
  function newThread() {
    const t: Thread = { id: uid(), title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    setSidebarOpen(false);
  }
  function deleteThread(tid: string) {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== tid);
      if (!next.length) {
        const fresh: Thread = { id: uid(), title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
        setActiveId(fresh.id);
        return [fresh];
      }
      if (tid === activeId) setActiveId(next[0].id);
      return next;
    });
  }
  function pushMsg(tid: string, msg: Msg, titleFrom?: string) {
    setThreads((prev) => prev.map((t) => {
      if (t.id !== tid) return t;
      const isFirst = t.messages.length === 0 && t.title === "New chat";
      return {
        ...t,
        title: isFirst && titleFrom ? titleFrom.slice(0, 48) : t.title,
        updatedAt: Date.now(),
        messages: [...t.messages, msg],
      };
    }));
  }

  /* ── Sign (cached per mission) ───────────────────────────────────────── */
  // Sisters bind a timestamp into the signed message (replay protection): a
  // cached signature is reused only while it's inside the server's accept
  // window (SIG_WINDOW_MS), then we transparently re-sign. FREELONS messages
  // carry NO timestamp — their cached signature stays valid indefinitely, so
  // the money-path UX is unchanged (no per-run wallet popups).
  async function sign(missionId: string): Promise<{ address: string; signature: string; ts: number }> {
    const e = eth();
    if (!e || !address) throw new Error("Connect your wallet first.");
    const cached = sigCache.current[missionId];
    if (cached && (!slug || Date.now() - cached.ts < SIG_WINDOW_MS)) {
      return { address, signature: cached.signature, ts: cached.ts };
    }
    const ts = Date.now();
    const message = slug
      ? `I am deploying ${slug} #${tokenId} on mission "${missionId}" at ${ts}.`
      : `I am deploying FREELON CITY citizen #${tokenId} on mission "${missionId}".`;
    const signature = (await e.request({ method: "personal_sign", params: [message, address] })) as string;
    sigCache.current[missionId] = { signature, ts };
    return { address, signature, ts };
  }

  /* ── Publish a rendered image to the City Archive (the creation loop) ──── */
  // Reuses POST /api/transmissions (walletProof-gated, burns the existing
  // submission cost). On 401 wallet_proof_required → proveWallet + retry, the
  // same pattern TransmissionSubmit uses. FREELONS only (needs civSlug).
  async function publishToArchive(imageUrl: string) {
    if (!canPublish || !civSlug) return;
    if (!address) { connect(); return; }
    setPublishState((s) => ({ ...s, [imageUrl]: "busy" }));
    const caption = `${name} · transmitted from FREELON CITY`;
    const doPost = () =>
      fetch("/api/transmissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addr: address, civ: civSlug, caption, imageUrl }),
      });
    const fail = (body: string) => {
      setPublishState((s) => ({ ...s, [imageUrl]: "error" }));
      cityNotice({ title: "Couldn't post to the City Archive", body, delta: "⬡ ARCHIVE" });
    };
    try {
      let res = await doPost();
      let j = await res.json().catch(() => ({}));
      if (res.status === 401 && j?.error === "wallet_proof_required") {
        const proof = await proveWallet(address);
        if (!proof.ok) {
          fail(
            proof.reason === "no_wallet"
              ? "Open this in your wallet's browser to transmit."
              : proof.reason === "rejected"
              ? "Signature declined — needed once to transmit."
              : "Couldn't prove wallet — retry.",
          );
          return;
        }
        res = await doPost();
        j = await res.json().catch(() => ({}));
      }
      if (!res.ok) {
        const map: Record<string, string> = {
          invalid_address: "Address malformed.",
          invalid_civ: "Invalid civilization.",
          invalid_caption: "Caption out of bounds.",
          image_url_must_be_https: "Image must be HTTPS.",
          image_url_too_long: "Image URL too long.",
          image_url_not_recognized: "Image URL unrecognized — must end in .jpg/.png/.webp.",
          session_required: "X session required.",
          not_a_carrier: "Carrier status required — hold ≥1 citizen.",
          insufficient_hex: `HEX balance low — need ${j.required ?? 100}⬡, have ${j.balance ?? "?"}⬡.`,
          debit_failed: "HEX debit failed — retry.",
          balance_unknown_retry: "Signal lost — retry.",
        };
        fail(map[j.error] || `Transmission rejected — ${j.error || "unknown"}.`);
        return;
      }
      setPublishState((s) => ({ ...s, [imageUrl]: "done" }));
      cityNotice({ title: "Posted to the City Archive", body: "Your transmission is live on the wall.", delta: "⬡ ARCHIVE" });
    } catch {
      fail("Network error — retry.");
    }
  }

  /* ── Run a mission (text or image), with auth retry ──────────────────── */
  async function runMission(missionId: string, input: string): Promise<{ ok: boolean; output?: { body: string; meta?: { kind?: string } }; error?: string; level?: number; balance?: number }> {
    const base: Record<string, unknown> = { missionId, input };
    let creds: { address: string; signature: string; ts: number } | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(missionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds ? { ...base, ...creds } : base),
      });
      const d = await res.json().catch(() => ({}));
      // Premium (⬡-spending) runs require a PROVEN wallet — the server returns
      // `wallet_proof_required` when the session is only bound (no walletProof),
      // which is the common case on mobile / a fresh device. Sign once and retry
      // with creds; the server accepts an inline {address,signature} as proof.
      // (Also covers plain `auth_required` for a sessionless caller.)
      if (res.status === 401 && (d?.error === "auth_required" || d?.error === "wallet_proof_required") && !creds) {
        // Surface the wallet-signature wait so the spinner copy switches from
        // "Rendering…" to "Waiting for your wallet signature…" (the popup can sit
        // unsigned for minutes — that's not a hang, it needs the user to approve).
        setAwaitingSig(true);
        try {
          creds = await sign(missionId);
        } finally {
          setAwaitingSig(false);
        }
        continue;
      }
      if (res.ok && d?.ok && d.output?.ok !== false && d.output?.body) {
        return { ok: true, output: d.output, level: d.level, balance: undefined };
      }
      return { ok: false, error: d?.message || d?.error || "The agent couldn't complete that — nothing was charged." };
    }
    return { ok: false, error: "Couldn't reach the agent. Try again." };
  }

  /* ── Send (chat or image) ────────────────────────────────────────────── */
  async function send() {
    if (sending || !active) return;
    if (!address) { connect(); return; }

    if (mode === "image") {
      const ab = agent?.scenes.find((s) => s.key === sceneKey);
      const label = ab?.label || "scene";
      const tid = active.id;
      setSending(true);
      pushMsg(tid, { id: uid(), role: "user", kind: "text", text: `Generate image · ${label}`, ts: Date.now() }, `Image · ${label}`);
      // Snapshot the image URLs we already know about, so we can detect a NEW
      // render even if the client never receives the response. (deploy-citizen
      // saves the image to history BEFORE replying — so on a flaky mobile
      // connection the render can SUCCEED server-side while the fetch drops.)
      const knownBefore = new Set<string>((agent?.history ?? []).filter((h) => h.kind === "image").map((h) => h.body));
      let shown = false;
      const showImage = (url: string) => {
        if (shown) return;
        shown = true;
        pushMsg(tid, { id: uid(), role: "agent", kind: "image", imageUrl: url, abilityLabel: label, ts: Date.now() });
        loadAgent();
        if (address) loadHex(address);
      };
      // The render saves to history BEFORE the request replies, and a render
      // takes ~15-30s — long enough that a flaky mobile connection can hang or
      // drop the response while the image SUCCEEDS server-side. So we don't wait
      // on the request alone: we RACE the request against a background poll of
      // history. Whichever surfaces the new image first wins; a hung fetch can
      // no longer leave the holder staring at a spinner with nothing delivered.
      try {
        const requestPath = (async (): Promise<string | null> => {
          // "@<form>" suffix picks the reference art (omitted for the default).
          const r = await runMission("deploy-citizen", formKey !== "figurative" ? `${sceneKey}@${formKey}` : sceneKey);
          return r.ok && r.output?.meta?.kind === "image" ? r.output.body : null;
        })().catch(() => null);
        const pollPath = pollForNewImage(knownBefore);

        // Whichever path yields a URL first, show it.
        const winner = await Promise.race([
          requestPath.then((u) => u || pollPath),
          pollPath.then((u) => u || requestPath),
        ]);
        if (winner) {
          showImage(winner);
        } else {
          // Neither the request nor the full poll window produced a new image —
          // a genuine failure (nothing was charged). Surface it once.
          pushMsg(tid, { id: uid(), role: "system", kind: "text", text: "Render didn't complete — your ⬡ was not charged. Try again.", error: true, ts: Date.now() });
        }
      } finally {
        setSending(false);
      }
      return;
    }

    // chat
    const brief = composer.trim();
    if (!brief) return;
    const ab = agent?.abilities.find((a) => a.id === abilityId);
    if (!ab) return;
    const tk = taskKey || ab.tasks[0]?.key || "";
    setComposer("");
    setSending(true);
    pushMsg(active.id, { id: uid(), role: "user", kind: "text", text: brief, abilityLabel: ab.label, ts: Date.now() }, brief);
    // City-assistant: if the brief looks navigational/help/lore-shaped, surface
    // allowlisted link cards under the reply (client-side, no LLM cost).
    const cityLinks = resolveCityDestinations(brief);
    try {
      const r = await runMission(ab.id, `${tk}: ${brief}`);
      if (r.ok && r.output?.body) {
        pushMsg(active.id, { id: uid(), role: "agent", kind: "text", text: r.output.body, abilityLabel: ab.label, links: cityLinks.length ? cityLinks : undefined, ts: Date.now() });
        // Celebrate a level-up: the agent's level went UP after this run.
        if (typeof r.level === "number" && agent && r.level > agent.level) {
          setLevelUp(r.level);
          cityNotice({ title: `${name} reached Level ${r.level}`, body: "Trained up — it reasons deeper now.", delta: `LV ${r.level}` });
        }
        setAgent((prev) => (prev && typeof r.level === "number" ? { ...prev, level: r.level } : prev));
        if (address) loadHex(address);
      } else {
        pushMsg(active.id, { id: uid(), role: "system", kind: "text", text: r.error || "No output — nothing was charged.", error: true, ts: Date.now() });
      }
    } catch (e) {
      pushMsg(active.id, { id: uid(), role: "system", kind: "text", text: (e as Error).message, error: true, ts: Date.now() });
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const curAbility = agent?.abilities.find((a) => a.id === abilityId) ?? null;
  const gallery = (agent?.history ?? []).filter((h) => h.kind === "image");
  // Work-history body is owner-only: prefer the signature-gated full history
  // (ownerHistory) when the proven owner has loaded it; otherwise fall back to
  // the public history. The render still gates the body span on landing?.isOwner.
  const textWork = (ownerHistory ?? agent?.history ?? []).filter((h) => h.kind === "text");
  // RECALL STRIP — surface the moat in the empty state: when the agent already
  // has history, show the last few things you built together so memory is FELT,
  // not just stored. Derived purely from the already-loaded history (no new
  // fetch). Safe kind-based labels; raw body is never surfaced here.
  const recall = (agent?.history ?? [])
    .slice(0, 3)
    .map((h) => {
      // Label by KIND only — never the raw generated body, which can leak
      // emojis, hype copy, test output, or private content into this compact
      // public-facing line.
      if (h.kind === "image") return "image deployment";
      if (h.kind === "text") return "content post";
      return "saved work";
    })
    .filter(Boolean);

  // GROUNDING LINE — the one sentence a generic chatbot structurally cannot
  // produce: built ONLY from on-chain facts the server confirmed for this
  // holder + this citizen. Each clause is conditional, so a partially-degraded
  // payload still yields a true, shorter sentence (never a fabricated fact, and
  // never "you've held me null days"). Empty → nothing renders.
  const grounding = useMemo(() => {
    if (!landing) return null;
    const parts: string[] = [];
    if (typeof landing.daysHeld === "number") {
      parts.push(
        landing.daysHeld <= 0
          ? "You took me on just today"
          : `You've held me ${landing.daysHeld} day${landing.daysHeld === 1 ? "" : "s"}`,
      );
    }
    if (typeof landing.otherHeld === "number" && landing.otherHeld > 0) {
      parts.push(`alongside ${landing.otherHeld} other citizen${landing.otherHeld === 1 ? "" : "s"} in your wallet`);
    }
    // Always assert provenance — civ is a static prop, so this clause is reliable
    // even if every network fact timed out (as long as the payload arrived).
    parts.push(`I'm a ${civName} citizen`);
    if (typeof landing.lastSaleEth === "number" && landing.lastSaleEth > 0) {
      parts.push(`last traded at ${landing.lastSaleEth} ETH`);
    }
    if (typeof landing.level === "number" && landing.level > 1) {
      const cls = landing.className ? ` ${landing.className}` : "";
      parts.push(
        typeof landing.rank === "number"
          ? `trained to Level ${landing.level}${cls}, ranked #${landing.rank} in the city`
          : `trained to Level ${landing.level}${cls}`,
      );
    }
    if (!parts.length) return null;
    return parts.join(", ") + ".";
  }, [landing, civName]);

  const cssVars = { "--accent": color } as React.CSSProperties;
  // FREELONS only: when payments are live and this citizen isn't unlocked yet,
  // surface the ETH unlock in the CENTER of the workspace (the pay flow that was
  // orphaned when the old dashboard was unmounted). Sisters have no unlock yet.
  const showUnlock = !slug && !!agent?.paymentsLive && !agent?.unlock?.unlocked;
  const flavour = createFlavour(slug);

  return (
    <div className={layout.shell} style={cssVars}>
      {/* ── THREADS DRAWER (chat-first collapse: hidden at all widths until ☰,
          exactly like ChatGPT's sidebar; markup/handlers unchanged) ───── */}
      <aside className={`${styles.sidebar} ${layout.drawer} ${sidebarOpen ? `${styles.open} ${layout.open}` : ""}`}>
        {/* Persistent NFT hero — the character is the hero of its own workspace,
            always on the left (Billy: "the nft on the left on the chatgpt
            layout"). Stays visible while chatting; the empty-state reveal used
            to be the only place the art showed at size. */}
        <div className={styles.sideHero}>
          <FramedAgent
            art={art}
            civColor={color}
            size={140}
            alt={name}
            name={name}
            stamp={`#${id4} · ${agent?.className ?? civName}`}
            priority
          />
          <div className={styles.sideHeroStats}>
            <span><small>LEVEL</small><strong>{agent ? agent.level : "…"}</strong></span>
            <span><small>CLASS</small><strong>{agent?.className ?? civName}</strong></span>
            <span style={{ gridColumn: "1 / -1" }}>
              <small>⬡ HEX</small>
              {address ? (
                <strong>{hex ?? "…"}</strong>
              ) : (
                <button
                  type="button"
                  onClick={connect}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--ink-dim)",
                    textDecoration: "underline",
                  }}
                >
                  Connect
                </button>
              )}
            </span>
          </div>
        </div>
        <div className={styles.sideHead}>
          <Link href={slug ? `/collections/${slug}` : `/citizens/${tokenId}`} className={styles.back}>← {slug ? "Collection" : "Citizen"}</Link>
          <button className={styles.newBtn} onClick={newThread}>+ New chat</button>
        </div>
        <div className={styles.threadList}>
          {threads.map((t) => (
            <div
              key={t.id}
              className={`${styles.threadRow} ${t.id === activeId ? styles.activeThread : ""}`}
              onClick={() => { setActiveId(t.id); setSidebarOpen(false); }}
            >
              <span className={styles.threadTitle}>{t.title}</span>
              <button
                className={styles.threadDel}
                onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                aria-label="Delete chat"
              >×</button>
            </div>
          ))}
        </div>
        <div className={styles.sideFoot}>
          <button
            type="button"
            onClick={enableSync}
            disabled={syncState === "syncing"}
            title="Back up your chats to your wallet so they follow you to any device. Private to your wallet."
            style={{
              width: "100%",
              marginBottom: 10,
              padding: "8px 10px",
              background: "transparent",
              border: `1px solid ${syncState === "on" ? "var(--gold)" : "var(--line-2)"}`,
              color: syncState === "on" ? "var(--gold)" : "var(--ink-2)",
              borderRadius: 8,
              fontFamily: "var(--mono2)",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: syncState === "syncing" ? "default" : "pointer",
            }}
          >
            {syncState === "on"
              ? "⬡ Synced to wallet"
              : syncState === "syncing"
              ? "Syncing…"
              : syncState === "error"
              ? "Sync failed · retry"
              : "⬡ Back up chats to wallet"}
          </button>
          <span className={styles.brand}>⬡ FREELON CITY</span>
        </div>
      </aside>

      {/* ── THE CHAT COLUMN — slim header, centered transcript, fold, composer */}
      <main className={`${styles.center} ${layout.centerFill}`}>
        <header className={styles.topbar}>
          <Link
            href={slug ? `/collections/${slug}` : `/citizens/${tokenId}`}
            className={layout.backBtn}
            aria-label={slug ? "Back to collection" : "Back to citizen"}
          >←</Link>
          <button className={layout.menuBtn} onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle chats">☰</button>
          <div className={styles.topTitle}>
            <img src={art} alt={name} className={styles.topAvatar} />
            <div>
              <div className={styles.topName}>{name}</div>
              <div className={styles.topSub}>#{id4} · Lv {agent?.level ?? "—"} · {agent?.className ?? civName}</div>
            </div>
          </div>
          <div className={styles.topRight}>
            {address ? (
              <span className={styles.hexPill} title="Your ⬡ balance">⬡ {hex ?? "…"}</span>
            ) : (
              <button className={styles.connectBtn} onClick={connect}>Connect</button>
            )}
          </div>
        </header>

        <div className={styles.transcript} ref={scrollRef}>
          <div className={layout.chatCol}>
          {!active || active.messages.length === 0 ? (
            <div className={styles.empty}>
              {/* PRESENCE (2026-06-11, kit: .living-city/ai-presence.md) —
                  DORMANT breath + accent aura on the lobby hero. className-only;
                  .tinted inherits this workspace's --accent (civ color). */}
              <FramedAgent
                art={art}
                civColor={color}
                size={208}
                alt={name}
                name={name}
                stamp={`#${id4} · ${agent?.className ?? civName} · LV ${agent?.level ?? 1}`}
                priority
                className={`${presence.aura} ${presence.tinted} ${presence.breath}`}
              />
              {props.headline && <p className={styles.emptyLede} style={{ marginTop: 14 }}>{props.headline}</p>}
              {tier === "Honorary" && (
                <div style={{ marginTop: 8 }}>
                  <HonoraryDisclaimer name={name} />
                </div>
              )}
              {showUnlock ? (
                // LOCKED — unlock is the only action. Lead with the pay panel; the
                // abilities show as a dimmed "what you'll unlock" preview, not a
                // doomed chat that 402s.
                <>
                  <p className={styles.emptyHint}>
                    Unlock this FREELON once with ETH to switch its agent on — then it can do anything: chat, strategy, research, red-team, dossier &amp; image generation, forever.
                  </p>
                  <WorkspaceUnlock
                    citizenId={tokenId}
                    address={address}
                    accent={color}
                    tier={agent?.unlock?.tier}
                    priceEth={agent?.unlock?.priceEth}
                    onConnect={connect}
                    onUnlocked={() => { loadAgent(); if (address) loadHex(address); }}
                  />
                  {(agent?.abilities ?? []).length > 0 && (
                    <>
                      <div className={styles.starterPreviewLabel}>What {name} does once it&apos;s on</div>
                      <div className={styles.starters} style={{ marginTop: 14 }}>
                        {(agent?.abilities ?? []).slice(0, 4).map((a) => (
                          <div key={a.id} className={`${styles.starter} ${styles.starterPreview}`}>
                            {a.label}
                            <small>{a.blurb}</small>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* SURFACE-REDUCTION 2026-06-09: CREATE is the hero action now —
                      it leads the lobby (was buried below intro/grounding/recall/
                      jobs). Neutral "CREATE WITH THIS CHARACTER" + per-collection
                      flavour line (multi-collection: FREELONS aren't the only
                      citizens). Proof (grounding/recall) + training + starters
                      follow BELOW, as support, not competition. */}
                  {(agent?.scenes?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      className={styles.heroRender}
                      onClick={() => setMode("image")}
                    >
                      <span className={styles.heroRenderHex} aria-hidden>⬡</span>
                      <span className={styles.heroRenderText}>
                        <strong>CREATE WITH THIS {flavour.noun}</strong>
                        <small>{flavour.line}</small>
                      </span>
                      <span className={styles.heroRenderArrow} aria-hidden>→</span>
                    </button>
                  )}
                  <p className={styles.emptyHint} style={{ marginTop: 12 }}>
                    {landing?.isOwner
                      ? "Or give it a brief — it remembers your work and grows as you train it."
                      : "An AI character with work history attached to the NFT."}
                  </p>
                  {/* CHAT-FIRST COLLAPSE (the Book): grounding line, recall strip
                      and the free-training jobs board moved to the ADVANCED fold
                      below the chat; the 4 ability starters became suggestion
                      chips above the composer. Handlers unchanged. */}
                  {/* The collectible-native powers. The launcher tabs live in the
                      "Agent Powers" section of the ADVANCED fold, so in the default
                      (none) empty state this center copy would just duplicate them.
                      Render it only once a power is actually open — it's the
                      component that draws the open panel (fold buttons only
                      set powersTab), so this keeps the feature fully intact while
                      removing the duplicate launcher row from the lobby. FREELONS only. */}
                  {!slug && powersTab !== "none" && (
                    <AgentPowers
                      citizenId={tokenId}
                      name={name}
                      accent={color}
                      address={address}
                      onConnect={connect}
                      open={powersTab}
                      onOpenChange={setPowersTab}
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            active.messages.map((m) => (
              <div key={m.id} className={`${styles.msgRow} ${m.role === "user" ? styles.user : styles.agent}`}>
                {m.role !== "user" && <img src={art} alt="" className={styles.msgAvatar} />}
                <div className={`${styles.bubble} ${m.error ? styles.errorBubble : ""}`}>
                  {m.abilityLabel && m.role === "agent" && <div className={styles.bubbleTag}>{m.abilityLabel}</div>}
                  {m.kind === "image" && m.imageUrl ? (
                    <>
                      <img src={m.imageUrl} alt={m.abilityLabel || "render"} className={styles.bubbleImg} onClick={() => setLightbox(m.imageUrl!)} />
                      {/* Creation loop: publish this render to the City Archive */}
                      {canPublish && m.role === "agent" && (() => {
                        const st = publishState[m.imageUrl!] ?? "idle";
                        return (
                          <button
                            type="button"
                            className={styles.bubbleTag}
                            style={{ marginTop: 8, cursor: st === "done" ? "default" : "pointer", border: `1px solid ${color}`, background: "transparent", color: st === "done" ? "var(--ink-dim)" : color }}
                            disabled={st === "busy" || st === "done"}
                            onClick={() => publishToArchive(m.imageUrl!)}
                          >
                            {st === "busy" ? "Posting…" : st === "done" ? "✓ In the City Archive" : st === "error" ? "Retry · Post to Archive" : "Post to City Archive →"}
                          </button>
                        );
                      })()}
                    </>
                  ) : (
                    <div className={styles.bubbleText}>
                      {m.text}
                      {m.links && m.links.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                          {m.links.map((lk) => {
                            const href = lk.key === "wallet" ? (address ? `/wallet/${address}` : "/sync") : lk.href;
                            return (
                              <Link
                                key={lk.key}
                                href={href}
                                className="panel-premium"
                                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", textDecoration: "none", color: "var(--ink)" }}
                              >
                                <span aria-hidden style={{ color: "var(--gold)", fontSize: 18, lineHeight: 1 }}>⬡</span>
                                <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                                  <span style={{ fontWeight: 700, fontSize: 13 }}>{lk.title}</span>
                                  <span style={{ fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.4 }}>{lk.blurb}</span>
                                </span>
                                <span aria-hidden style={{ color: "var(--gold)", fontSize: 16 }}>→</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className={`${styles.msgRow} ${styles.agent}`}>
              {/* THINKING inner-activity on the avatar while the agent is genuinely
                  working — NOT while awaiting the user's wallet signature (that's
                  the user's turn, the agent is honestly idle). Row unmounts with
                  `sending`, so the portrait reverts to dormant automatically. */}
              <img src={art} alt="" className={`${styles.msgAvatar}${awaitingSig ? "" : ` ${tv.thinking}`}`} />
              {mode === "image" ? (
                <div className={`${styles.bubble} ${styles.renderBubble}`}>
                  <span className={styles.hexSpinner} aria-hidden>⬡</span>
                  <span className={styles.renderCol}>
                    <span className={styles.renderLabel}>{awaitingSig ? "Waiting for your wallet signature…" : `Rendering ${name}…`}</span>
                    <span className={styles.renderHint}>{awaitingSig ? "Approve the request in your wallet to continue — nothing is charged until you sign." : "Usually ~15s — stay here, it\u2019ll appear right in this chat."}</span>
                  </span>
                </div>
              ) : awaitingSig ? (
                <div className={`${styles.bubble} ${styles.renderBubble}`}>
                  <span className={styles.hexSpinner} aria-hidden>⬡</span>
                  <span className={styles.renderCol}>
                    <span className={styles.renderLabel}>Waiting for your wallet signature…</span>
                    <span className={styles.renderHint}>Approve the request in your wallet to continue — nothing is charged until you sign.</span>
                  </span>
                </div>
              ) : (
                /* Kit THINKING state replaces the generic typing dots: status
                   verb in mono lowercase, the one shimmer on this screen,
                   rotated deterministically by message count. */
                <div className={styles.bubble}>
                  <ThinkingVerb seed={active ? active.messages.length : 0} />
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* ── THE ONE FOLD — everything non-chat, below the chat. Content moved
            verbatim from the old always-visible right pane + empty-state lobby
            (fold, never delete); every handler and conditional unchanged. */}
        <details className={layout.advanced}>
          <summary className={layout.advSummary}>ADVANCED · TOOLS &amp; RECORDS</summary>
          <div className={`${layout.advBody} ${infoOpen ? styles.open : ""}`}>
            <div className={layout.advCol}>
              {/* Landing-pad grounding + recall strip (moved from the lobby). */}
              {grounding && (
                <p
                  className={styles.emptyHint}
                  style={{ marginTop: 0, color: "var(--accent, var(--gold))", fontStyle: "italic" }}
                >
                  “{grounding}”
                </p>
              )}
              {recall.length > 0 && (
                <p
                  className={styles.emptyHint}
                  style={{ marginTop: 10, color: "var(--accent, var(--gold))" }}
                >
                  {landing?.isOwner ? `Last time, you and ${name} worked on: ` : `Recent work history attached to ${name}: `}{recall.join(" · ")}
                </p>
              )}
              {/* Free daily training — the zero-cost, can't-fail action.
                  FREELONS only (sisters have no /job backing); self-hides for
                  non-owners. */}
              {!slug && <CitizenJobsBoard citizenId={tokenId} />}

              {/* Citizen identity + records (moved from the old right pane). */}
              <div className={layout.advIdentity}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 4, marginTop: 14 }}>
                  <FramedAgent art={art} civColor={color} size={244} alt={name} />
                </div>
                <div className={styles.infoName}>{name}</div>
                <div className={styles.infoMeta}>#{id4} · {tier} · {civName}</div>
                {tier === "Honorary" && (
                  <div style={{ textAlign: "center" }}>
                    <HonoraryDisclaimer name={name} />
                  </div>
                )}
              </div>
              <div className={styles.statRow}>
                <div className={styles.stat}><span>Level</span><strong>{agent?.level ?? "—"}</strong></div>
                <div className={styles.stat}><span>Class</span><strong>{agent?.className ?? "—"}</strong></div>
                <div className={styles.stat}><span>⬡ Balance</span><strong>{address ? (hex ?? "…") : "—"}</strong></div>
              </div>

              {agent && agent.paymentsLive && !agent.unlock.unlocked ? (
                <button
                  type="button"
                  className={styles.unlockCta}
                  style={{ textAlign: "left", width: "100%", cursor: "pointer" }}
                  onClick={() => { setInfoOpen(false); newThread(); }}
                >
                  <strong>Locked</strong>
                  <span>Unlock with ETH to switch on premium abilities →</span>
                </button>
              ) : agent && agent.unlock.unlocked ? (
                <div className={styles.activated}>⬡ Activated{agent.unlock.credits ? ` · ${agent.unlock.credits} runs` : ""}</div>
              ) : null}

              {/* AGENT POWERS — each jumps back to a fresh lobby with that
                  power open. FREELONS only. */}
              {!slug && (
                <section className={styles.infoSec}>
                  <h3>Agent Powers</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {([
                      ["transmission", "⬡ Daily Transmission"],
                      ["chronicle", "The Chronicle"],
                      ["versus", "⬡ Versus"],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setInfoOpen(false); newThread(); setPowersTab(key); }}
                        style={{
                          textAlign: "left", padding: "9px 12px", borderRadius: 9, cursor: "pointer",
                          background: "var(--surface)", border: "1px solid var(--line-2)", color: "var(--ink)",
                          fontFamily: "var(--mono2)", fontSize: 12.5, letterSpacing: "0.02em",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* CITY DISPATCH — the public-record action. Self-gates: owners get
                  the send control, visitors only ever see the log, and it renders
                  nothing for a citizen with no history. FREELONS only. */}
              {!slug && (
                <section className={styles.infoSec}>
                  <DispatchPanel citizenId={tokenId} name={name} />
                </section>
              )}

              {gallery.length > 0 && (
                <section className={styles.infoSec}>
                  <h3>Gallery</h3>
                  <div className={styles.galGrid}>
                    {gallery.map((g) => (
                      <img key={g.id} src={g.body} alt="" className={styles.galThumb} onClick={() => setLightbox(g.body)} />
                    ))}
                  </div>
                </section>
              )}

              {textWork.length > 0 && (
                <section className={styles.infoSec}>
                  <h3>Work history</h3>
                  <ul className={styles.workList}>
                    {textWork.slice(0, 12).map((w) => (
                      <li key={w.id}>
                        <span className={styles.workAbility}>{w.abilityLabel || w.ability}</span>
                        {/* Raw saved body is the owner's memory. The PUBLIC agent API
                            strips text `body` (Prompt 9), so non-owners — and the owner
                            before the /history/full overlay loads — have NO body here.
                            Guard with optional chaining: `w.body` can be undefined, and
                            calling .slice on it crashed the whole workspace (the "SIGNAL
                            HAS FAULTED" boundary). Only render when body is present. */}
                        {landing?.isOwner && w.body && <span className={styles.workBody}>{w.body.slice(0, 90)}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </details>

        {/* ── Composer ─────────────────────────────────────────────────── */}
        <div className={styles.composer}>
          <div className={layout.composerCol}>
          {/* Suggestion chips (ChatGPT suggested prompts) — the 4 ability
              starters, shown on a fresh chat; same pickStarter trigger. */}
          {!showUnlock && (!active || active.messages.length === 0) && (agent?.abilities?.length ?? 0) > 0 && (
            <div className={layout.suggestRow}>
              {(agent?.abilities ?? []).slice(0, 4).map((a) => (
                <button key={a.id} type="button" className={layout.suggestChip} title={a.blurb} onClick={() => pickStarter(a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
          <div className={styles.modeRow}>
            <button className={`${styles.modeBtn} ${mode === "chat" ? styles.modeOn : ""}`} onClick={() => setMode("chat")}>Chat</button>
            {(agent?.scenes?.length ?? 0) > 0 && (
              <button className={`${styles.modeBtn} ${mode === "image" ? styles.modeOn : ""}`} onClick={() => setMode("image")}>Image</button>
            )}
          </div>
          {mode === "chat" && curAbility && (agent?.abilities.length ?? 0) > 1 && (
              <div className={styles.chipRow}>
                {agent?.abilities.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`${styles.chip} ${a.id === abilityId ? styles.chipOn : ""}`}
                    onClick={() => setAbilityId(a.id)}
                  >
                    {a.label}{a.premium ? <span className={styles.chipCost}>{a.hexCost ?? 0}⬡</span> : null}
                  </button>
                ))}
              </div>
            )}
            {mode === "chat" && curAbility && curAbility.tasks.length > 1 && (
              <div className={styles.chipRow}>
                {curAbility.tasks.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`${styles.chip} ${t.key === taskKey ? styles.chipOn : ""}`}
                    onClick={() => setTaskKey(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            {mode === "image" && (agent?.forms?.length ?? 0) > 1 && (
              // Reference-art picker — this token has more than one reveal
              // form; the holder chooses which version of their citizen renders.
              <div className={styles.chipRow}>
                {agent!.forms!.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`${styles.chip} ${f.key === formKey ? styles.chipOn : ""}`}
                    onClick={() => setFormKey(f.key)}
                  >
                    Art · {f.label}
                  </button>
                ))}
              </div>
            )}
            {mode === "image" && (
              scenesOpen ? (
                <div className={styles.chipRow}>
                  {agent?.scenes.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className={`${styles.chip} ${s.key === sceneKey ? styles.chipOn : ""}`}
                      onClick={() => { setSceneKey(s.key); setScenesOpen(false); }}
                    >
                      {s.label}{agent?.imageHexCost ? <span className={styles.chipCost}>{agent.imageHexCost}⬡</span> : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.chipRow}>
                  <button
                    type="button"
                    className={`${styles.chip} ${styles.chipOn}`}
                    onClick={() => setScenesOpen(true)}
                  >
                    Scene · {agent?.scenes.find((s) => s.key === sceneKey)?.label ?? "choose"} · change ▾
                    {agent?.imageHexCost ? <span className={styles.chipCost}>{agent.imageHexCost}⬡</span> : null}
                  </button>
                </div>
              )
            )}
          {showUnlock ? (
            // Locked → the composer can't run anything; route the holder to unlock.
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", maxWidth: 760, margin: "0 auto", display: "block" }}
              onClick={() => { setInfoOpen(false); setActiveId(threads[0]?.id ?? activeId); }}
            >
              <span className="ttl">⬡ UNLOCK{agent?.unlock?.priceEth ? ` · ${agent.unlock.priceEth} ETH` : ""} TO START →</span>
            </button>
          ) : mode === "chat" ? (
            <div className={styles.inputRow}>
              <textarea
                ref={composerRef}
                className={styles.input}
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={curAbility ? `Type here — tell ${name} what to do, then press ↵` : "Connect your wallet to begin…"}
                rows={1}
                disabled={sending}
              />
              <button className={styles.send} onClick={send} disabled={sending || !composer.trim()}>
                {sending ? "…" : "↑"}
              </button>
            </div>
          ) : (
            <div className={styles.inputRow}>
              <div className={styles.imageHint}>Render {name} into the selected scene.</div>
              <button className={styles.send} onClick={send} disabled={sending}>
                {sending ? "Rendering…" : "Generate"}
              </button>
            </div>
          )}
          <div className={styles.disclaimer}>AI-generated · verify before acting. Your work history stays with the NFT.</div>
          </div>
        </div>
      </main>

      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
        </div>
      )}

      {levelUp !== null && (
        <LevelUpCelebration level={levelUp} name={name} tokenId={tokenId} accent={color} onClose={() => setLevelUp(null)} />
      )}
    </div>
  );
}

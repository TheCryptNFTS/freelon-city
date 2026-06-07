"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./AgentWorkspace.module.css";

/* ──────────────────────────────────────────────────────────────────────────
 * AGENT WORKSPACE — the ChatGPT/Claude-style home for ONE citizen-agent.
 *
 * A holder clicks their citizen and lands here: a 3-pane app. LEFT = their
 * saved conversations (threads). CENTER = the chat (text replies + inline
 * generated images). RIGHT = the citizen itself — level, ⬡ balance, unlock
 * status, image gallery, and durable work history.
 *
 * It reuses the LIVE backend untouched:
 *   - GET  /api/citizens/[id]/agent            → abilities, scenes, unlock, history
 *   - POST /api/citizens/[id]/mission          → run a text/image job
 *   - GET  /api/wallet/[address]/hex           → ⬡ balance
 * Threads are the conversational layer and live in localStorage (the durable
 * per-NFT record — history, dossier, images, level — already lives server-side
 * and is shown in the right pane). Signatures are cached per ability, since the
 * signed message names the mission, so a holder signs once per ability, not per
 * message.
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
  error?: boolean;
  ts: number;
};
type Thread = { id: string; title: string; createdAt: number; updatedAt: number; messages: Msg[] };

type Props = {
  tokenId: number;
  name: string;
  art: string;
  tier: string;
  civName: string;
  doctrine: string;
  color: string;
  headline: string | null;
  /** Sister-collection slug. Omitted/"freelons" → the flagship FREELONS agent
   *  (rich abilities/images/unlock). Any other agentic slug → a sister agent
   *  (chat-only, free) served by /api/agents/[slug]/[id]. */
  slug?: string;
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function AgentWorkspace(props: Props) {
  const { tokenId, name, art, tier, civName, color } = props;
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
  const [composer, setComposer] = useState("");
  const [mode, setMode] = useState<"chat" | "image">("chat");
  const [abilityId, setAbilityId] = useState<string>("");
  const [taskKey, setTaskKey] = useState<string>("");
  const [sceneKey, setSceneKey] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const sigCache = useRef<Record<string, { signature: string; ts: number }>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const SIG_WINDOW_MS = 30 * 60 * 1000;
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
      if (res.status === 401 && d?.error === "auth_required" && !creds) {
        creds = await sign(missionId);
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
      setSending(true);
      pushMsg(active.id, { id: uid(), role: "user", kind: "text", text: `Generate image · ${label}`, ts: Date.now() }, `Image · ${label}`);
      try {
        const r = await runMission("deploy-citizen", sceneKey);
        if (r.ok && r.output?.meta?.kind === "image") {
          pushMsg(active.id, { id: uid(), role: "agent", kind: "image", imageUrl: r.output.body, abilityLabel: label, ts: Date.now() });
          loadAgent();
          if (address) loadHex(address);
        } else {
          pushMsg(active.id, { id: uid(), role: "system", kind: "text", text: r.error || "Render failed.", error: true, ts: Date.now() });
        }
      } catch (e) {
        pushMsg(active.id, { id: uid(), role: "system", kind: "text", text: (e as Error).message, error: true, ts: Date.now() });
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
    try {
      const r = await runMission(ab.id, `${tk}: ${brief}`);
      if (r.ok && r.output?.body) {
        pushMsg(active.id, { id: uid(), role: "agent", kind: "text", text: r.output.body, abilityLabel: ab.label, ts: Date.now() });
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
  const textWork = (agent?.history ?? []).filter((h) => h.kind === "text");
  const cssVars = { "--accent": color } as React.CSSProperties;

  return (
    <div className={styles.shell} style={cssVars}>
      {/* ── LEFT: threads ─────────────────────────────────────────────── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ""}`}>
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
          <span className={styles.brand}>⬡ FREELON CITY</span>
        </div>
      </aside>

      {/* ── CENTER: chat ──────────────────────────────────────────────── */}
      <main className={styles.center}>
        <header className={styles.topbar}>
          <button className={styles.iconBtn} onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle chats">☰</button>
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
            <button className={styles.iconBtn} onClick={() => setInfoOpen((v) => !v)} aria-label="Citizen info">ⓘ</button>
          </div>
        </header>

        <div className={styles.transcript} ref={scrollRef}>
          {!active || active.messages.length === 0 ? (
            <div className={styles.empty}>
              <img src={art} alt={name} className={styles.emptyArt} />
              <h2>{name}</h2>
              {props.headline && <p className={styles.emptyLede}>{props.headline}</p>}
              <p className={styles.emptyHint}>
                An AI agent you own. Give it a brief below — it remembers your work and grows as you train it.
              </p>
              <div className={styles.starters}>
                {(agent?.abilities ?? []).slice(0, 4).map((a) => (
                  <button key={a.id} className={styles.starter} onClick={() => { setMode("chat"); setAbilityId(a.id); }}>
                    {a.label}<small>{a.blurb}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            active.messages.map((m) => (
              <div key={m.id} className={`${styles.msgRow} ${m.role === "user" ? styles.user : styles.agent}`}>
                {m.role !== "user" && <img src={art} alt="" className={styles.msgAvatar} />}
                <div className={`${styles.bubble} ${m.error ? styles.errorBubble : ""}`}>
                  {m.abilityLabel && m.role === "agent" && <div className={styles.bubbleTag}>{m.abilityLabel}</div>}
                  {m.kind === "image" && m.imageUrl ? (
                    <img src={m.imageUrl} alt={m.abilityLabel || "render"} className={styles.bubbleImg} onClick={() => setLightbox(m.imageUrl!)} />
                  ) : (
                    <div className={styles.bubbleText}>{m.text}</div>
                  )}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className={`${styles.msgRow} ${styles.agent}`}>
              <img src={art} alt="" className={styles.msgAvatar} />
              <div className={styles.bubble}><div className={styles.typing}><span/><span/><span/></div></div>
            </div>
          )}
        </div>

        {/* ── Composer ─────────────────────────────────────────────────── */}
        <div className={styles.composer}>
          <div className={styles.modeRow}>
            <button className={`${styles.modeBtn} ${mode === "chat" ? styles.modeOn : ""}`} onClick={() => setMode("chat")}>Chat</button>
            {(agent?.scenes?.length ?? 0) > 0 && (
              <button className={`${styles.modeBtn} ${mode === "image" ? styles.modeOn : ""}`} onClick={() => setMode("image")}>Image</button>
            )}
            {mode === "chat" && curAbility && (
              <div className={styles.selectors}>
                <select className={styles.sel} value={abilityId} onChange={(e) => setAbilityId(e.target.value)}>
                  {agent?.abilities.map((a) => <option key={a.id} value={a.id}>{a.label}{a.premium ? ` · ${a.hexCost ?? 0}⬡` : ""}</option>)}
                </select>
                {curAbility.tasks.length > 1 && (
                  <select className={styles.sel} value={taskKey} onChange={(e) => setTaskKey(e.target.value)}>
                    {curAbility.tasks.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                )}
              </div>
            )}
            {mode === "image" && (
              <div className={styles.selectors}>
                <select className={styles.sel} value={sceneKey} onChange={(e) => setSceneKey(e.target.value)}>
                  {agent?.scenes.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                {agent?.imageHexCost ? <span className={styles.costHint}>{agent.imageHexCost}⬡</span> : null}
              </div>
            )}
          </div>
          {mode === "chat" ? (
            <div className={styles.inputRow}>
              <textarea
                className={styles.input}
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={curAbility ? `Brief ${name} — ${curAbility.blurb}` : "Connect your wallet to begin…"}
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
      </main>

      {/* ── RIGHT: citizen info ───────────────────────────────────────── */}
      <aside className={`${styles.info} ${infoOpen ? styles.open : ""}`}>
        <button className={styles.infoClose} onClick={() => setInfoOpen(false)} aria-label="Close">×</button>
        <img src={art} alt={name} className={styles.infoArt} />
        <div className={styles.infoName}>{name}</div>
        <div className={styles.infoMeta}>#{id4} · {tier} · {civName}</div>
        <div className={styles.statRow}>
          <div className={styles.stat}><span>Level</span><strong>{agent?.level ?? "—"}</strong></div>
          <div className={styles.stat}><span>Class</span><strong>{agent?.className ?? "—"}</strong></div>
          <div className={styles.stat}><span>⬡ Balance</span><strong>{address ? (hex ?? "…") : "—"}</strong></div>
        </div>

        {agent && agent.paymentsLive && !agent.unlock.unlocked ? (
          <Link href={`/citizens/${tokenId}`} className={styles.unlockCta}>
            <strong>Locked</strong>
            <span>Unlock with ETH to switch on premium jobs →</span>
          </Link>
        ) : agent && agent.unlock.unlocked ? (
          <div className={styles.activated}>⬡ Activated{agent.unlock.credits ? ` · ${agent.unlock.credits} runs` : ""}</div>
        ) : null}

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
                  <span className={styles.workBody}>{w.body.slice(0, 90)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
        </div>
      )}
    </div>
  );
}

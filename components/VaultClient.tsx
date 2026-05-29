"use client";

/**
 * /vault — safe batch-transfer of FREELON citizens.
 *
 * Contract is standard ERC-721 (no batchTransfer) so "batch" is sequential
 * transferFrom calls, one per citizen, signed individually in MetaMask.
 *
 * Critical UX features:
 *   - Test-send: defaults ON. Sends the FIRST selected citizen, then PAUSES
 *     and waits for explicit confirmation before sending the rest.
 *   - Per-citizen progress: queued → confirming → confirmed | failed | rejected
 *   - On any failure, stops the loop so the user can review.
 *   - Saved trusted wallets live in localStorage only (no server).
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createWalletClient, createPublicClient, custom, http, fallback } from "viem";
import { mainnet } from "viem/chains";
import { CONTRACT, imageUrl, LOCAL_HEROES } from "@/lib/constants";

// ── viem clients ─────────────────────────────────────────────────────
const CONFIGURED_RPC =
  process.env.NEXT_PUBLIC_ETH_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  null;
const FALLBACK_RPCS = [
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org",
];
const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [
      ...(CONFIGURED_RPC ? [http(CONFIGURED_RPC, { timeout: 5_000 })] : []),
      ...FALLBACK_RPCS.map((u) => http(u, { timeout: 4_000 })),
    ],
    { rank: false, retryCount: 1 },
  ),
});

// Standard ERC-721 transferFrom fragment.
const TRANSFER_ABI = [
  {
    name: "transferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const ADDR_RE = /^0x[a-f0-9]{40}$/i;

type TxState = "queued" | "confirming" | "confirmed" | "failed" | "rejected";
type TxRow = { tokenId: number; state: TxState; hash?: string; error?: string };

type Trusted = { label: string; address: string };
const TRUSTED_KEY = "freelon:vault:trusted";

function loadTrusted(): Trusted[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRUSTED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is Trusted => {
        if (!x || typeof x !== "object") return false;
        const o = x as Record<string, unknown>;
        return typeof o.label === "string" && typeof o.address === "string" && ADDR_RE.test(o.address);
      })
      .map((t) => ({ label: t.label, address: t.address.toLowerCase() }));
  } catch {
    return [];
  }
}
function saveTrusted(list: Trusted[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRUSTED_KEY, JSON.stringify(list));
  } catch {/* quota — ignore */}
}

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── component ────────────────────────────────────────────────────────
export function VaultClient() {
  // wallet
  const [addr, setAddr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectErr, setConnectErr] = useState<string | null>(null);

  // tokens
  const [tokens, setTokens] = useState<number[] | null>(null);
  const [tokensErr, setTokensErr] = useState<string | null>(null);
  const [tokensLoading, setTokensLoading] = useState(false);

  // selection
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // recipient
  const [recipient, setRecipient] = useState("");
  const [trusted, setTrusted] = useState<Trusted[]>([]);
  const [saveAs, setSaveAs] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");

  // test-send
  const [testSend, setTestSend] = useState(true);
  const [awaitingTestConfirm, setAwaitingTestConfirm] = useState(false);

  // progress
  const [rows, setRows] = useState<TxRow[]>([]);
  const [running, setRunning] = useState(false);
  const runLock = useRef(false);

  // ── connect ────────────────────────────────────────────────────────
  useEffect(() => {
    setTrusted(loadTrusted());
    if (typeof window === "undefined" || !window.ethereum) return;
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accs) => {
        const list = accs as string[];
        if (list && list[0]) setAddr(list[0].toLowerCase());
      })
      .catch(() => {});
  }, []);

  const connect = useCallback(async () => {
    setConnectErr(null);
    if (typeof window === "undefined") return;
    if (!window.ethereum) {
      setConnectErr("No wallet found. Install MetaMask or open in a wallet browser.");
      return;
    }
    setConnecting(true);
    try {
      const accs = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accs && accs[0]) setAddr(accs[0].toLowerCase());
    } catch (e) {
      setConnectErr((e as Error).message || "Connection refused.");
    } finally {
      setConnecting(false);
    }
  }, []);

  // ── load tokens once connected ─────────────────────────────────────
  useEffect(() => {
    if (!addr) {
      setTokens(null);
      return;
    }
    let cancelled = false;
    setTokensLoading(true);
    setTokensErr(null);
    fetch(`/api/wallet/${addr}/tokens`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j: { tokenIds?: number[] }) => {
        if (cancelled) return;
        const ids = Array.isArray(j.tokenIds) ? j.tokenIds.slice().sort((a, b) => a - b) : [];
        setTokens(ids);
      })
      .catch((e) => {
        if (cancelled) return;
        setTokensErr((e as Error).message || "Failed to load citizens.");
        setTokens([]);
      })
      .finally(() => {
        if (!cancelled) setTokensLoading(false);
      });
    return () => { cancelled = true; };
  }, [addr]);

  // ── derived ────────────────────────────────────────────────────────
  const ownedCount = tokens?.length ?? 0;
  const selectedIds = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const recipientNorm = recipient.trim().toLowerCase();
  const recipientValid = ADDR_RE.test(recipientNorm);
  const recipientIsSender = recipientValid && addr ? recipientNorm === addr : false;
  const canTransfer =
    !!addr &&
    selected.size > 0 &&
    recipientValid &&
    !recipientIsSender &&
    !running &&
    !awaitingTestConfirm;

  // ── selection helpers ──────────────────────────────────────────────
  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAll = () => setSelected(new Set(tokens ?? []));
  const deselectAll = () => setSelected(new Set());

  // ── transfer loop ──────────────────────────────────────────────────
  const runTransfers = useCallback(
    async (ids: number[]) => {
      if (!addr || !ids.length) return;
      if (runLock.current) return;
      runLock.current = true;
      setRunning(true);

      // Maybe persist trusted entry.
      if (saveAs && saveLabel.trim() && recipientValid) {
        const label = saveLabel.trim().slice(0, 40);
        const next = [...trusted.filter((t) => t.address !== recipientNorm), { label, address: recipientNorm }];
        setTrusted(next);
        saveTrusted(next);
      }

      const walletClient = createWalletClient({
        chain: mainnet,
        transport: custom(window.ethereum!),
        account: addr as `0x${string}`,
      });

      // Initialise / extend rows for these ids as queued.
      setRows((prev) => {
        const existing = new Map(prev.map((r) => [r.tokenId, r] as const));
        for (const id of ids) {
          if (!existing.has(id)) existing.set(id, { tokenId: id, state: "queued" });
        }
        return [...existing.values()].sort((a, b) => a.tokenId - b.tokenId);
      });

      let stoppedEarly = false;
      for (const tokenId of ids) {
        // Mark confirming
        setRows((prev) =>
          prev.map((r) => (r.tokenId === tokenId ? { ...r, state: "confirming" } : r)),
        );
        let hash: `0x${string}` | null = null;
        try {
          hash = await walletClient.writeContract({
            address: CONTRACT as `0x${string}`,
            abi: TRANSFER_ABI,
            functionName: "transferFrom",
            args: [addr as `0x${string}`, recipientNorm as `0x${string}`, BigInt(tokenId)],
          });
        } catch (e) {
          const msg = (e as Error).message || "Transaction failed.";
          // MetaMask user-rejected → code 4001 or text "User rejected"
          const rejected = /user reject|user denied|rejected|4001/i.test(msg);
          setRows((prev) =>
            prev.map((r) =>
              r.tokenId === tokenId
                ? { ...r, state: rejected ? "rejected" : "failed", error: msg }
                : r,
            ),
          );
          stoppedEarly = true;
          break;
        }
        // Wait for receipt
        try {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          const ok = receipt.status === "success";
          setRows((prev) =>
            prev.map((r) =>
              r.tokenId === tokenId
                ? {
                    ...r,
                    state: ok ? "confirmed" : "failed",
                    hash,
                    error: ok ? undefined : "Reverted on-chain.",
                  }
                : r,
            ),
          );
          if (!ok) {
            stoppedEarly = true;
            break;
          }
        } catch (e) {
          setRows((prev) =>
            prev.map((r) =>
              r.tokenId === tokenId
                ? { ...r, state: "failed", hash: hash ?? undefined, error: (e as Error).message }
                : r,
            ),
          );
          stoppedEarly = true;
          break;
        }
      }

      setRunning(false);
      runLock.current = false;
      return !stoppedEarly;
    },
    [addr, recipientNorm, recipientValid, saveAs, saveLabel, trusted],
  );

  const onTransferClick = useCallback(async () => {
    if (!canTransfer) return;
    if (testSend && selectedIds.length > 1) {
      // First citizen only, then pause.
      const first = [selectedIds[0]];
      const ok = await runTransfers(first);
      if (ok) setAwaitingTestConfirm(true);
    } else {
      await runTransfers(selectedIds);
    }
  }, [canTransfer, testSend, selectedIds, runTransfers]);

  const onSendRest = useCallback(async () => {
    setAwaitingTestConfirm(false);
    // Filter out anything already confirmed/failed/rejected.
    const done = new Set(rows.filter((r) => r.state !== "queued").map((r) => r.tokenId));
    const rest = selectedIds.filter((id) => !done.has(id));
    if (rest.length === 0) return;
    await runTransfers(rest);
  }, [rows, selectedIds, runTransfers]);

  const onRetry = useCallback(
    async (tokenId: number) => {
      if (running) return;
      setRows((prev) =>
        prev.map((r) => (r.tokenId === tokenId ? { ...r, state: "queued", error: undefined } : r)),
      );
      await runTransfers([tokenId]);
    },
    [running, runTransfers],
  );

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div className="vault-page">
      <section className="vault-hero">
        <span className="kicker">⬡ VAULT · SAFE TRANSFER</span>
        <h1 className="vault-h1">Move your citizens.<br /><em>One transaction at a time.</em></h1>
        <p className="vault-sub">
          Batch-transfer to cold storage, consolidate wallets, or gift. The contract is standard
          ERC-721 — every citizen is its own signed transaction. Test-send is on by default.
        </p>
      </section>

      {/* SECTION A — Connection */}
      <section className="v-section v-connect">
        {!addr ? (
          <>
            <button type="button" className="btn btn-primary" onClick={connect} disabled={connecting}>
              <span className="ttl">{connecting ? "CONNECTING…" : "CONNECT WALLET →"}</span>
            </button>
            <ul className="v-bullets">
              <li>⬡ Your wallet stays in your browser. Nothing is sent to a server.</li>
              <li>⬡ Every transfer is signed individually in MetaMask. We never custody your keys.</li>
              <li>⬡ Saved trusted wallets live in your browser only (localStorage).</li>
            </ul>
            {connectErr && <p className="v-err">{connectErr}</p>}
          </>
        ) : (
          <div className="v-connected">
            <span className="v-dot" />
            <code className="v-addr">{short(addr)}</code>
            <span className="v-meta">
              {tokensLoading
                ? "scanning citizens…"
                : `${ownedCount} citizen${ownedCount !== 1 ? "s" : ""} owned`}
            </span>
          </div>
        )}
      </section>

      {/* SECTION B — Safety */}
      <section className="v-section v-safety">
        <span className="kicker">⬡ SAFETY BRIEFING</span>
        <ul className="v-safety-list">
          <li>Transferring an NFT is <strong>irreversible</strong>. The receiving wallet must be one you control.</li>
          <li>We recommend you <strong>test send 1 citizen first</strong>, confirm it arrived, then send the rest.</li>
          <li>The architect <strong>cannot recover</strong> citizens sent to the wrong wallet.</li>
          <li>Saved trusted wallets live in your <strong>browser only</strong> (localStorage), not on any server.</li>
        </ul>
      </section>

      {/* SECTION C — Multi-select */}
      {addr && (
        <section className="v-section v-select">
          <div className="v-section-head">
            <span className="kicker">⬡ SELECT CITIZENS</span>
            <div className="v-counter">
              {selected.size} selected of {ownedCount} owned
            </div>
            <div className="v-select-actions">
              <button type="button" className="v-mini" onClick={selectAll} disabled={!ownedCount}>SELECT ALL</button>
              <button type="button" className="v-mini" onClick={deselectAll} disabled={!selected.size}>DESELECT ALL</button>
            </div>
          </div>
          {tokensErr && <p className="v-err">Failed to load citizens: {tokensErr}</p>}
          {!tokensLoading && tokens && tokens.length === 0 && (
            <p className="v-empty">No citizens on file for this wallet.</p>
          )}
          {tokens && tokens.length > 0 && (
            <ul className="v-grid">
              {tokens.map((tid) => {
                const id4 = tid.toString().padStart(4, "0");
                const src = LOCAL_HEROES.has(tid) ? `/heroes/${id4}.webp` : imageUrl(tid);
                const on = selected.has(tid);
                return (
                  <li key={tid}>
                    <label className={`v-card ${on ? "on" : ""}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(tid)}
                        disabled={running}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`#${id4}`} loading="lazy" />
                      <span className="v-id">#{id4}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* SECTION D — Recipient */}
      {addr && (
        <section className="v-section v-recipient">
          <span className="kicker">⬡ RECIPIENT WALLET</span>
          <div className="v-field">
            <input
              type="text"
              spellCheck={false}
              autoComplete="off"
              placeholder="0x… (42 chars)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={running}
              className="v-input"
            />
            <div className="v-validation">
              {recipient && !recipientValid && <span className="v-err">Not a valid 0x address.</span>}
              {recipientIsSender && <span className="v-err">Recipient is the sender — that would be a costly no-op.</span>}
              {recipientValid && !recipientIsSender && <span className="v-ok">Valid · {short(recipientNorm)}</span>}
            </div>
          </div>
          {trusted.length > 0 && (
            <div className="v-trusted">
              <label className="v-trusted-label">SAVED TRUSTED WALLETS</label>
              <select
                className="v-input"
                onChange={(e) => { if (e.target.value) setRecipient(e.target.value); }}
                value=""
                disabled={running}
              >
                <option value="">— pick saved wallet —</option>
                {trusted.map((t) => (
                  <option key={t.address} value={t.address}>
                    {t.label} · {short(t.address)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="v-save-row">
            <label className="v-check">
              <input
                type="checkbox"
                checked={saveAs}
                onChange={(e) => setSaveAs(e.target.checked)}
                disabled={running}
              />
              Save as trusted
            </label>
            {saveAs && (
              <input
                type="text"
                placeholder="Label (e.g. cold storage)"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                disabled={running}
                className="v-input v-input-sm"
                maxLength={40}
              />
            )}
          </div>
        </section>
      )}

      {/* SECTION E — Test send: PROMOTED to major safety card (Phase 3).
          A wrong-address mistake here is permanent and uninsurable. The
          test-send toggle deserves the same visual weight as the actual
          TRANSFER button, not a small footnote checkbox. */}
      {addr && (
        <section className="v-section v-test v-safety-card">
          <span className="kicker" style={{ color: "var(--gold)" }}>⬡ SAFETY CHECK · TEST SEND FIRST</span>
          <label className="v-check v-check--prominent">
            <input
              type="checkbox"
              checked={testSend}
              onChange={(e) => setTestSend(e.target.checked)}
              disabled={running || awaitingTestConfirm}
            />
            <strong>Test send first</strong> — send only the first selected citizen, then pause for your confirmation before sending the rest.
          </label>
          {!testSend && (
            <p className="v-warn">Test send disabled — all selected citizens will be sent without pause.</p>
          )}
        </section>
      )}

      {/* SECTION F — Transfer button + progress */}
      {addr && (
        <section className="v-section v-transfer">
          {!awaitingTestConfirm ? (
            <button
              type="button"
              className="btn btn-primary v-go"
              disabled={!canTransfer}
              onClick={onTransferClick}
            >
              <span className="ttl">
                TRANSFER {selected.size} CITIZEN{selected.size !== 1 ? "S" : ""} →
              </span>
            </button>
          ) : (
            <div className="v-test-confirm">
              <p>
                Test send complete. <strong>Verify the citizen arrived</strong> in the recipient wallet
                (check Etherscan/OpenSea), then send the rest.
              </p>
              <div className="v-test-actions">
                <button type="button" className="btn btn-primary" onClick={onSendRest} disabled={running}>
                  <span className="ttl">ALL CLEAR — SEND THE REST →</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAwaitingTestConfirm(false)}
                  disabled={running}
                >
                  <span className="ttl">CANCEL</span>
                </button>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <ul className="v-progress">
              {rows.map((r) => {
                const id4 = r.tokenId.toString().padStart(4, "0");
                const glyph =
                  r.state === "confirmed" ? "✓"
                  : r.state === "confirming" ? "⌛"
                  : r.state === "failed" ? "✗"
                  : r.state === "rejected" ? "⊘"
                  : "⏸";
                return (
                  <li key={r.tokenId} className={`v-prow v-${r.state}`}>
                    <span className="v-glyph">{glyph}</span>
                    <span className="v-pid">#{id4}</span>
                    <span className="v-pstate">{r.state.toUpperCase()}</span>
                    {r.hash && (
                      <a
                        href={`https://etherscan.io/tx/${r.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="v-plink"
                      >
                        etherscan ↗
                      </a>
                    )}
                    {(r.state === "failed" || r.state === "rejected") && (
                      <button
                        type="button"
                        className="v-mini"
                        onClick={() => onRetry(r.tokenId)}
                        disabled={running}
                      >
                        RETRY
                      </button>
                    )}
                    {r.error && <span className="v-perr" title={r.error}>{r.error.slice(0, 60)}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="v-foot">
        <Link href="/dashboard" className="btn btn-ghost"><span className="ttl">← Dashboard</span></Link>
        <Link href="/start" className="btn btn-ghost"><span className="ttl">Start Here</span></Link>
      </section>

      <style>{`
        .vault-page { max-width: 1100px; margin: 0 auto; padding: var(--s-5) var(--s-4) var(--s-7); }
        .vault-hero { margin-bottom: var(--s-6); text-align: center; }
        .vault-h1 { font-family: var(--display); font-size: clamp(36px, 5.5vw, 56px); line-height: 0.98; letter-spacing: -0.02em; margin: 10px 0 14px; }
        .vault-h1 em { color: var(--gold); font-style: normal; }
        .vault-sub { font-family: var(--mono2); font-size: 14px; color: var(--ink-2); line-height: 1.7; max-width: 620px; margin: 0 auto; }
        .v-section { margin-bottom: var(--s-5); padding: var(--s-4); border: 1px solid var(--line); background: rgba(255,255,255,0.02); border-radius: 12px; }
        /* Phase 3: test-send safety card — visual weight matched to the TRANSFER button. */
        .v-safety-card {
          border: 1px solid var(--gold);
          background: linear-gradient(135deg, rgba(200,167,93,0.10), rgba(200,167,93,0.02));
          padding: var(--s-5);
        }
        .v-check--prominent {
          font-size: 15px;
          line-height: 1.6;
          padding: 12px 0;
        }
        .v-check--prominent input { width: 20px; height: 20px; }
        .v-bullets { font-family: var(--mono2); font-size: 12px; color: var(--ink-2); line-height: 1.8; margin: 14px 0 0; padding: 0; list-style: none; }
        .v-connected { display: flex; align-items: center; gap: 12px; font-family: var(--mono2); font-size: 13px; color: var(--ink); }
        .v-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--state-active); box-shadow: 0 0 8px var(--state-active); }
        .v-addr { color: var(--gold); letter-spacing: 0.08em; }
        .v-meta { color: var(--ink-2); letter-spacing: 0.12em; text-transform: uppercase; font-size: 11px; }
        .v-safety-list { font-family: var(--mono2); font-size: 13px; color: var(--ink-2); line-height: 1.75; padding-left: 18px; margin: 12px 0 0; }
        .v-safety-list strong { color: var(--gold); }
        .v-section-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: var(--s-3); }
        .v-counter { font-family: var(--mono2); font-size: 11px; letter-spacing: 0.2em; color: var(--gold); text-transform: uppercase; }
        .v-select-actions { display: flex; gap: 8px; margin-left: auto; }
        .v-mini { background: transparent; border: 1px solid var(--line-2); color: var(--ink-2); font-family: var(--mono2); font-size: 10px; letter-spacing: 0.18em; padding: 6px 12px; border-radius: 4px; cursor: pointer; text-transform: uppercase; min-height: 32px; }
        @media (max-width: 540px) { .v-mini { min-height: var(--tap-min); font-size: 12px; padding: 8px 14px; } .v-id { font-size: 11px; padding: 6px 6px; } }
        .v-mini:hover:not(:disabled) { color: var(--gold); border-color: var(--gold); }
        .v-mini:disabled { opacity: 0.4; cursor: not-allowed; }
        .v-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; list-style: none; padding: 0; margin: 0; }
        .v-card { position: relative; display: block; cursor: pointer; border: 2px solid var(--line); border-radius: 8px; overflow: hidden; transition: border-color .15s ease, transform .15s ease; }
        .v-card:hover { border-color: var(--ink-2); }
        .v-card.on { border-color: var(--gold); transform: scale(0.97); }
        .v-card input { position: absolute; top: 6px; left: 6px; z-index: 2; accent-color: var(--gold); width: 18px; height: 18px; cursor: pointer; }
        .v-card img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; }
        .v-id { display: block; padding: 4px 6px; font-family: var(--mono2); font-size: 10px; color: var(--ink-2); text-align: center; letter-spacing: 0.08em; }
        .v-field { display: flex; flex-direction: column; gap: 6px; }
        .v-input { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid var(--line-2); color: var(--ink); font-family: var(--mono2); font-size: 13px; padding: 10px 12px; border-radius: 6px; letter-spacing: 0.04em; }
        .v-input:focus { outline: none; border-color: var(--gold); }
        .v-input-sm { font-size: 12px; padding: 8px 10px; }
        .v-validation { font-family: var(--mono2); font-size: 11px; letter-spacing: 0.08em; min-height: 16px; }
        .v-ok { color: var(--state-active); }
        .v-err { color: var(--state-danger); font-family: var(--mono2); font-size: 12px; }
        .v-warn { color: var(--state-surge); font-family: var(--mono2); font-size: 12px; margin-top: 8px; }
        .v-trusted { margin-top: 12px; }
        .v-trusted-label { display: block; font-family: var(--mono2); font-size: 10px; letter-spacing: 0.22em; color: var(--ink-2); text-transform: uppercase; margin-bottom: 6px; }
        .v-save-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
        .v-check { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono2); font-size: 13px; color: var(--ink); cursor: pointer; line-height: 1.5; }
        .v-check input { accent-color: var(--gold); }
        .v-empty { font-family: var(--mono2); font-size: 13px; color: var(--ink-2); }
        .v-go { display: block; width: 100%; max-width: 420px; margin: 0 auto; }
        .v-test-confirm { padding: var(--s-3); border: 1px solid var(--gold); background: rgba(200,170,100,0.06); border-radius: 8px; }
        .v-test-confirm p { font-family: var(--mono2); font-size: 13px; color: var(--ink); margin: 0 0 12px; line-height: 1.6; }
        .v-test-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .v-progress { list-style: none; padding: 0; margin: var(--s-4) 0 0; display: flex; flex-direction: column; gap: 6px; }
        .v-prow { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 6px; font-family: var(--mono2); font-size: 12px; flex-wrap: wrap; }
        .v-prow.v-confirmed { border-color: #2a5a3a; background: rgba(20,40,30,0.3); }
        .v-prow.v-confirming { border-color: var(--gold); background: rgba(200,170,100,0.05); }
        .v-prow.v-failed, .v-prow.v-rejected { border-color: #5a2a2a; background: rgba(40,20,20,0.3); }
        .v-glyph { font-size: 14px; width: 18px; text-align: center; }
        .v-pid { color: var(--gold); letter-spacing: 0.08em; min-width: 60px; }
        .v-pstate { color: var(--ink-2); letter-spacing: 0.16em; font-size: 10px; min-width: 80px; }
        .v-plink { color: var(--ink-2); text-decoration: underline; font-size: 11px; }
        .v-plink:hover { color: var(--gold); }
        .v-perr { color: var(--state-danger); font-size: 11px; opacity: 0.8; }
        .v-foot { display: flex; gap: 12px; justify-content: center; margin-top: var(--s-5); }
      `}</style>
    </div>
  );
}

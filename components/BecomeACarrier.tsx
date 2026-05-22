"use client";
import Link from "next/link";
import { useViewerAddr, useXVerification } from "@/lib/use-viewer";

/**
 * Homepage onboarding card showing the canonical 2-step path:
 *   ① Connect wallet
 *   ② Sign in with X (bound to that wallet)
 *
 * Tracks state across both: completed steps dim with a green tick,
 * the pending step lights up as the next action. When both are done,
 * the card collapses to a single "you're a carrier — go earn" CTA.
 */
export function BecomeACarrier() {
  const viewer = useViewerAddr();
  const x = useXVerification(viewer.addr);

  if (!viewer.ready) return null;

  const walletDone = !!viewer.addr;
  const xDone = walletDone && x.ready && x.verified;
  const allDone = walletDone && xDone;

  // Collapsed "carrier ready" state — no need to nag verified users
  if (allDone) {
    return (
      <section
        style={{
          maxWidth: 1100,
          margin: "var(--s-6) auto",
          padding: "var(--s-4)",
          border: "1px solid #7AE08D55",
          background: "linear-gradient(90deg, rgba(122,224,141,0.08) 0%, rgba(0,0,0,0.3) 100%)",
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span className="kicker" style={{ color: "#7AE08D" }}>⬡ CARRIER · READY</span>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", margin: "6px 0 0", lineHeight: 1.5 }}>
            Wallet <code>{viewer.addr!.slice(0, 6)}…{viewer.addr!.slice(-4)}</code> bound to{" "}
            <strong style={{ color: "#7AE08D" }}>@{x.xHandle}</strong>. The city pays you for active work.
          </p>
        </div>
        <Link href="/carrier" className="btn btn-primary">
          <span className="ttl">CLAIM TODAY&apos;S 10 ⬡ →</span>
        </Link>
      </section>
    );
  }

  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "var(--s-6) auto",
        padding: "var(--s-5) var(--s-5)",
        border: "1px solid var(--line-2)",
        borderRadius: 18,
        background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(0,0,0,0.3) 100%)",
      }}
    >
      <div style={{ marginBottom: "var(--s-3)", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ BECOME A CARRIER</span>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
          TWO STEPS · ~30 SECONDS
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--s-3)",
        }}
      >
        <Step
          num="①"
          title="Connect your wallet"
          body={walletDone
            ? `Connected as ${viewer.addr!.slice(0, 6)}…${viewer.addr!.slice(-4)}`
            : "The city reads your holdings from the chain. No signature needed yet."}
          status={walletDone ? "done" : "active"}
          action={walletDone ? null : {
            label: "CONNECT WALLET →",
            onClick: () => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setTimeout(() => {
                document.querySelector<HTMLButtonElement>(".wallet-connect button")?.focus();
              }, 400);
            },
          }}
        />
        <Step
          num="②"
          title="Sign in with X"
          body={xDone
            ? `Bound to @${x.xHandle}`
            : walletDone
              ? "Binds your X handle to the connected wallet so claims, tithes, and snipes credit correctly."
              : "Step ② unlocks once your wallet is connected."}
          status={xDone ? "done" : walletDone ? "active" : "locked"}
          action={
            xDone
              ? null
              : walletDone
                ? { label: "SIGN IN WITH X →", href: `/api/x/start?bind=${encodeURIComponent(viewer.addr!)}` }
                : null
          }
        />
      </div>
    </section>
  );
}

type StepStatus = "done" | "active" | "locked";

function Step({
  num,
  title,
  body,
  status,
  action,
}: {
  num: string;
  title: string;
  body: string;
  status: StepStatus;
  action: { label: string; href?: string; onClick?: () => void } | null;
}) {
  const tone =
    status === "done"
      ? { border: "#7AE08D55", color: "#7AE08D", bg: "rgba(122,224,141,0.06)" }
      : status === "active"
        ? { border: "var(--gold)", color: "var(--gold)", bg: "rgba(200,167,93,0.08)" }
        : { border: "var(--line)", color: "var(--ink-dim)", bg: "transparent" };
  return (
    <article
      style={{
        padding: "var(--s-4)",
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: status === "locked" ? 0.55 : 1,
        minHeight: 170,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: "var(--display)", fontSize: 28, color: tone.color, lineHeight: 1 }}>{num}</span>
        {status === "done" && (
          <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "#7AE08D" }}>
            ✓ DONE
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 18, margin: 0, color: "var(--ink)" }}>{title}</h3>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55, margin: 0 }}>
          {body}
        </p>
      </div>
      {action && (
        <div style={{ marginTop: "auto" }}>
          {action.href ? (
            <a
              href={action.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${tone.color}`,
                background: `${tone.color}1a`,
                color: tone.color,
                textDecoration: "none",
                fontFamily: "var(--mono2)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {action.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${tone.color}`,
                background: `${tone.color}1a`,
                color: tone.color,
                fontFamily: "var(--mono2)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

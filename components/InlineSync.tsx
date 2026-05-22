"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useViewerAddr } from "@/lib/use-viewer";

export function InlineSync() {
  const router = useRouter();
  const [val, setVal] = useState("");
  const viewer = useViewerAddr();
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const h = val.replace(/^@/, "").trim();
    if (!h) return;
    router.push(`/sync?h=${encodeURIComponent(h)}`);
  }
  const xSignin = () => {
    // Bind X session to the connected wallet so the resulting session
    // can actually act on the wallet's behalf. If no wallet, focus
    // the header connect button — never bind to a temp value (silent fail).
    if (!viewer.addr) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        document.querySelector<HTMLButtonElement>(".wallet-connect button")?.focus();
      }, 400);
      return;
    }
    window.location.href = `/api/x/start?bind=${encodeURIComponent(viewer.addr)}`;
  };

  const xDisabled = !viewer.ready || !viewer.addr;
  const xLabel = !viewer.ready
    ? "…"
    : viewer.addr
      ? "SIGN IN WITH X (VERIFIED) ↗"
      : "CONNECT WALLET FIRST →";

  return (
    <div className="inline-sync">
      <form onSubmit={submit} autoComplete="off">
        <input
          type="text"
          placeholder="@yourhandle"
          maxLength={64}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          required
        />
        <button type="submit">SYNC →</button>
      </form>
      <div className="x-signin-row">
        <span className="x-or">— OR —</span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={xSignin}
          style={xDisabled ? { opacity: 0.55 } : undefined}
          aria-disabled={xDisabled || undefined}
        >
          <span className="ttl">{xLabel}</span>
        </button>
      </div>
    </div>
  );
}

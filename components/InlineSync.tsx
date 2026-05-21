"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function InlineSync() {
  const router = useRouter();
  const [val, setVal] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const h = val.replace(/^@/, "").trim();
    if (!h) return;
    router.push(`/sync?h=${encodeURIComponent(h)}`);
  }
  const xSignin = () => {
    const seed = val.replace(/^@/, "").trim() || `temp_${Date.now()}`;
    window.location.href = `/api/x/start?bind=${encodeURIComponent(seed)}`;
  };
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
        <button type="button" className="btn btn-secondary btn-sm" onClick={xSignin}>
          <span className="ttl">SIGN IN WITH X (VERIFIED) ↗</span>
        </button>
      </div>
    </div>
  );
}

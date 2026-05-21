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
  return (
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
  );
}

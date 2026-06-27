"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FindCitizen() {
  const router = useRouter();
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const id = parseInt(val, 10);
    if (!Number.isFinite(id) || id < 1 || id > 4040) {
      setErr("enter a number between 1 and 4040");
      return;
    }
    router.push(`/citizens/${id}`);
  }

  return (
    <form onSubmit={go} autoComplete="off">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="Citizen token number (1–4040)"
        placeholder="ENTER TOKEN #"
        value={val}
        onChange={(e) => { setVal(e.target.value); setErr(""); }}
      />
      <button type="submit">FIND →</button>
      {err && (
        <span style={{ display: "block", marginTop: 8, fontFamily: "var(--mono2)", fontSize: 11, color: "#c54a3a", letterSpacing: "0.16em" }}>
          {err}
        </span>
      )}
    </form>
  );
}

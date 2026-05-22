"use client";

import { useRouter } from "next/navigation";

export default function RandomCitizenButton() {
  const router = useRouter();

  function go() {
    const id = Math.floor(Math.random() * 4040) + 1;
    router.push(`/citizens/${id}`);
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={go}>
      <span className="lbl">RANDOM</span>
      <span className="ttl">OPEN A RANDOM CITIZEN <span className="ar">→</span></span>
    </button>
  );
}

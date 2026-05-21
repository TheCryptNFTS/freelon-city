"use client";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";

export function CitizenOwnedByYou({ citizenId }: { citizenId: number }) {
  const h = useHolder();
  const o = useOwnsCitizen(citizenId, h.address);
  if (h.loading || o.loading) return null;
  if (!o.isOwner) return null;
  return <div className="owned-by-you">⬡ YOU OWN THIS CITIZEN</div>;
}

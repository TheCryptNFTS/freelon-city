import Link from "next/link";
import { Citizen, civilizationColor } from "@/lib/citizens";
import { imageUrl } from "@/lib/constants";
import { GhostedMask } from "@/components/GhostedMask";

export function CitizenCard({ citizen, size = "md" }: { citizen: Citizen; size?: "sm" | "md" | "lg" }) {
  const color = civilizationColor(citizen.civilization);
  const id4 = citizen.id.toString().padStart(4, "0");
  return (
    <Link
      href={`/citizens/${citizen.id}`}
      className="block group rounded-lg overflow-hidden border border-white/5 bg-[var(--color-bg-lifted)] hover:border-[color-mix(in_oklab,var(--color-gold),transparent_50%)] transition-colors"
      style={{ borderTopColor: color, borderTopWidth: 2 }}
    >
      <div className="relative aspect-square bg-black">
        <GhostedMask tokenId={citizen.id} variant="card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl(citizen.id)}
            alt={citizen.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        </GhostedMask>
      </div>
      <div className="p-3">
        <div className="terminal text-xs text-[var(--color-gold)]">#{id4}</div>
        <div className={`mt-0.5 font-medium ${size === "sm" ? "text-xs" : "text-sm"} truncate`}>
          {citizen.transmission_name || citizen.honoree || citizen.shape}
        </div>
        {size !== "sm" && (
          <div className="mt-1 text-[10px] uppercase tracking-widest text-[var(--color-ink-dim)] truncate">
            {citizen.tier} · {citizen.caste}
          </div>
        )}
      </div>
    </Link>
  );
}

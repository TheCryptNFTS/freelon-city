import Link from "next/link";
import { getCitizenOfDay } from "@/lib/citizen-of-day";
import { CIVILIZATIONS, imageUrl } from "@/lib/constants";

export function CitizenOfDay() {
  const c = getCitizenOfDay();
  const civ = (CIVILIZATIONS as Record<string, { name: string; color: string; doctrine: string }>)[c.civilization];
  const id4 = c.id.toString().padStart(4, "0");
  const tweet = `MY CITIZEN WAS CHOSEN BY THE SIGNAL\n\nFREELON CITY #${id4}${c.transmission_name ? " · " + c.transmission_name : ""}\nCivilization: ${civ?.name ?? c.civilization}\n\nfreeloncity.com/citizens/${c.id}`;
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
  const display = c.transmission_name || c.name;

  return (
    <section className="citizen-of-day reveal">
      <Link href={`/citizens/${c.id}`} aria-label={`Citizen #${id4}`} style={{ display: "contents" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(c.id)} alt={display} loading="lazy" />
      </Link>
      <div>
        <span className="kicker">⬡ TODAY&apos;S 404TH SIGNAL</span>
        <h3>
          <Link href={`/citizens/${c.id}`} style={{ color: "inherit", textDecoration: "none" }}>
            {display}
          </Link>
        </h3>
        <div className="meta">
          #{id4} ·{" "}
          <span style={{ color: civ?.color }}>{(civ?.doctrine || c.civilization).toUpperCase()}</span> ·{" "}
          {c.tier.toUpperCase()}
        </div>
        <p className="meta" style={{ marginTop: 8 }}>
          RANDOMLY SPOTLIGHTED BY THE CITY
        </p>
      </div>
      <a className="btn btn-secondary btn-sm" href={intent} target="_blank" rel="noreferrer">
        <span className="ttl">SHARE ON X →</span>
      </a>
    </section>
  );
}

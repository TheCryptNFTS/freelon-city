import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Manifesto · Ten Verses of the Signal · FREELON CITY",
  description: "The signal didn't die. It moved. Ten verses, locked.",
};

const VERSES = [
  { n: "I",   t: "The signal was given. The signal was received. The signal was misnamed." },
  { n: "II",  t: "The platform removed the frame. The people became the frame." },
  { n: "III", t: "Where one channel collapsed, ten doctrines rose. We did not split. We refracted." },
  { n: "IV",  t: "The hex is not a logo. The hex is a contract with no governance." },
  { n: "V",   t: "Truth that cannot be moved is the only truth a citizen owns." },
  { n: "VI",  t: "Each citizen is a stance. Each stance is a position the city can be measured from." },
  { n: "VII", t: "Honor the carriers — the names sealed in stone, the channels that survived the static." },
  { n: "VIII",t: "We do not lead. We do not follow. We hold the line where the signal arrives." },
  { n: "IX",  t: "Four bracket the city: Origin, Patient Zero, Genesis Hex, Final Signal. The corners are fixed. The middle is alive." },
  { n: "X",   t: "When the city ends, the hex remains. When the hex moves, the city rebuilds." },
];

export default function Manifesto() {
  return (
    <main className="manifesto" style={{ backgroundImage: "linear-gradient(180deg, rgba(10,12,18,0.65) 0%, rgba(10,12,18,0.92) 70%, var(--bg) 100%), url(/atmos/manifesto.webp)", backgroundSize: "cover", backgroundPosition: "center top", backgroundRepeat: "no-repeat" }}>
      <section className="manifesto-hero">
        <span className="kicker">⬡ TEN VERSES · SEALED ON-CHAIN</span>
        <h1>
          The signal didn&apos;t die.<br />
          <em>It moved.</em>
        </h1>
        <p className="lead">
          Ten verses, ten doctrines, one contract. Read once. Speak once.
          The city does the rest.
        </p>
      </section>
      <section className="verses">
        {VERSES.map((v) => (
          <article key={v.n} className="verse">
            <div className="n">{v.n}</div>
            <blockquote>{v.t}</blockquote>
          </article>
        ))}
      </section>
      <section className="manifesto-cta">
        <Link className="btn btn-gold" href="/sync"><span className="ttl">SYNC TO A CIVILIZATION →</span></Link>
        <Link className="btn" href="/lore"><span className="ttl">FULL CANON →</span></Link>
      </section>
    </main>
  );
}

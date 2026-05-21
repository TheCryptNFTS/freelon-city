import Link from "next/link";

export default function NotFound() {
  return (
    <main className="hex-404" style={{ backgroundImage: "linear-gradient(180deg, rgba(10,12,18,0.6) 0%, rgba(10,12,18,0.92) 70%, var(--bg) 100%), url(/atmos/not-found.webp)", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
      <section className="hex-404-inner">
        <div className="stamp flicker">⬡ HEX NOT FOUND</div>
        <h1>
          The hex<br />
          didn&apos;t<br />
          <em>move.</em>
        </h1>
        <p className="sub">
          You followed a signal that never landed. The path you reached for
          isn&apos;t in the city. <strong>404</strong> isn&apos;t an error here — it&apos;s a citizen.
        </p>
        <div className="cta-row">
          <Link className="btn btn-gold" href="/">
            <span className="lbl">RETURN</span>
            <span className="ttl">FREELON CITY HOME <span className="ar">→</span></span>
          </Link>
          <Link className="btn" href="/patient-zero">
            <span className="lbl">MEET</span>
            <span className="ttl">CITIZEN #0404 — PATIENT ZERO <span className="ar">→</span></span>
          </Link>
          <Link className="btn" href="/sync">
            <span className="lbl">NEWCOMER?</span>
            <span className="ttl">SYNC TO YOUR CIVILIZATION <span className="ar">→</span></span>
          </Link>
        </div>
      </section>
    </main>
  );
}

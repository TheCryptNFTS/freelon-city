import Link from "next/link";

export const metadata = { title: "Origin" };

export default function Page() {
  return (
    <div
      className="origin-page"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(10,12,18,0.5) 0%, rgba(10,12,18,0.94) 65%, var(--bg) 100%), url(/origin/founding.webp)",
        backgroundSize: "1600px auto",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
    >
      <article className="origin-inner">
        <span className="term-badge flicker"><span className="dot" />404 HEX NOT FOUND</span>
        <h1>
          The hex didn&apos;t<br />
          disappear.<br />
          <em>It changed location</em>
        </h1>

        <div className="origin-body">
          <p>X once made digital ownership visible. A small hexagonal mark appeared next to verified NFT profile pictures — proof of ownership, woven into identity, visible in every feed.</p>
          <p>Then it was quietly removed. No replacement. No handoff. Just absence.</p>
          <p className="emph">The platform took back the frame.</p>
          <p>FREELON CITY is the answer to that absence. Not a meme. Not a clapback. A civilization.</p>
          <p>Humanity colonised Mars. Then it began detecting a signal — origin unknown, possibly Earth, possibly somewhere beyond. A city formed around it. The signal reshaped its citizens — biologically, spiritually, technologically. The hexagon, present in the signal&apos;s mathematics, present in planetary architecture, present in transmission systems, became sacred.</p>
          <p>The hex is not decoration in FREELON CITY. It is infrastructure. Religion. Code. Power.</p>
          <p className="emph">Every citizen carries one. Embedded in the face. Cut into the porcelain. The hex is anatomy now.</p>
          <p>4040 citizens. 10 Signal civilizations. 7 castes. 16 sacred geometric shapes. 35 honoraries named for the people who shaped crypto culture. 4 one-of-ones marking the founder, the first-corrupted, the warrior-priest, the closer.</p>
          <p>The platform removed the frame. The people became the frame.</p>
        </div>

        <div className="origin-chant">ON MARS. WE HEAR. WE SYNC. WE ARE.</div>

        <div className="origin-cta">
          <Link href="/lore" className="btn btn-primary">
            <span className="ttl">READ THE FULL LORE <span className="ar">→</span></span>
          </Link>
          <Link href="/civilizations" className="btn btn-secondary">
            <span className="ttl">EXPLORE CIVILIZATIONS →</span>
          </Link>
          <Link href="/citizens" className="btn btn-secondary">
            <span className="ttl">FIND YOUR CITIZEN →</span>
          </Link>
        </div>
      </article>
    </div>
  );
}

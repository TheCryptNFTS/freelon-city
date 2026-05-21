import Link from "next/link";
import type { Metadata } from "next";
import { InlineSync } from "@/components/InlineSync";
import { syncHandle } from "@/lib/sync";
import { CIVILIZATIONS, imageUrl, openseaUrl } from "@/lib/constants";

export const revalidate = 60;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ h?: string }> }): Promise<Metadata> {
  const sp = await searchParams;
  if (!sp.h) {
    return {
      title: "SYNC · Receive the signal · FREELON CITY",
      description: "Drop your handle. Sync to your civilization. Find your patron citizen.",
    };
  }
  const r = syncHandle(sp.h);
  const civ = (CIVILIZATIONS as Record<string, { name: string; doctrine: string }>)[r.civilization];
  return {
    title: `@${r.handle} → ${civ?.name} · ${r.caste}`,
    description: `Synced to ${civ?.name}. Patron citizen #${r.patron.id.toString().padStart(4,"0")}. Caste: ${r.caste}.`,
    openGraph: { images: [{ url: `/api/og/${r.patron.id}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [`/api/og/${r.patron.id}`] },
  };
}

export default async function SyncPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const sp = await searchParams;
  if (!sp.h) {
    return (
      <main
        className="sync-empty"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(10,12,18,0.5) 0%, rgba(10,12,18,0.92) 60%, var(--bg) 100%), url(/atmos/sync.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <section className="sync-hero">
          <span className="kicker">⬡ NEWCOMER PROTOCOL · 0404</span>
          <h1>Drop your handle.<br />Sync to your <em>civilization.</em></h1>
          <p>
            FREELON CITY is divided into 10 Signal Doctrines. Your handle is hashed
            once — same handle, same civ, every time. No randomness. No re-rolls.
            The signal already knows.
          </p>
          <div className="big-input">
            <InlineSync />
          </div>
        </section>
      </main>
    );
  }
  const r = syncHandle(sp.h);
  const civ = (CIVILIZATIONS as Record<string, { name: string; doctrine: string; color: string; role: string; chant: string; population: number }>)[r.civilization];
  const id4 = r.patron.id.toString().padStart(4, "0");
  const tweet = `I synced to FREELON CITY.\n\n@${r.handle} → ${civ.name}\nCaste: ${r.caste}\nPatron: #${id4}\n\nThe signal knows where you belong.\n\nfreeloncity.com/sync?h=${r.handle}`;
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  return (
    <main className="sync-result" style={{ "--civ": civ.color } as React.CSSProperties}>
      <section className="sync-result-hero">
        <div className="left">
          <div className="stamp">⬡ SYNC COMPLETE · @{r.handle}</div>
          <h1>You belong to<br /><em style={{ color: civ.color }}>{civ.name}.</em></h1>
          <p className="doctrine">{civ.doctrine.toUpperCase()} · {civ.role.toUpperCase()}</p>
          <div className="chant">&ldquo;{civ.chant}&rdquo;</div>
          <dl className="sync-stats">
            <div><dt>CASTE</dt><dd>{r.caste}</dd></div>
            <div><dt>CIV POPULATION</dt><dd>{civ.population} / 4040</dd></div>
            <div><dt>SAME-CIV SPREAD</dt><dd>{r.spread} citizens</dd></div>
          </dl>
        </div>
        <div className="right">
          <Link href={`/citizens/${r.patron.id}`} className="patron-card">
            <div className="lbl">YOUR PATRON CITIZEN</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(r.patron.id)} alt={r.patron.name} />
            <div className="meta">
              <div className="id">#{id4}</div>
              <div className="name">{r.patron.name}</div>
            </div>
          </Link>
        </div>
      </section>
      <section className="sync-cta">
        <a className="btn btn-gold" href={intent} target="_blank" rel="noreferrer">
          <span className="lbl">SHARE YOUR SYNC</span>
          <span className="ttl">POST TO X <span className="ar">→</span></span>
        </a>
        <Link className="btn" href={`/civilizations/${r.civilization}`}>
          <span className="lbl">ENTER YOUR CIV</span>
          <span className="ttl">{civ.name.toUpperCase()} <span className="ar">→</span></span>
        </Link>
        <a className="btn" href={openseaUrl(r.patron.id)} target="_blank" rel="noreferrer">
          <span className="lbl">PATRON</span>
          <span className="ttl">VIEW ON OPENSEA ↗</span>
        </a>
        <Link className="btn" href="/sync">
          <span className="lbl">DIFFERENT HANDLE?</span>
          <span className="ttl">RESYNC <span className="ar">→</span></span>
        </Link>
      </section>
    </main>
  );
}

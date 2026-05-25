import type { Metadata } from "next";
import { CarrierClient } from "./CarrierClient";

export const metadata: Metadata = {
  title: "Carrier Rank · Hold the signal",
  description: "Holders own citizens. Carriers hold the signal. Daily decay. No reset. The city remembers.",
};

export default function CarrierPage() {
  return (
    <div className="carrier-page" style={{ backgroundImage: "linear-gradient(180deg, rgba(10,12,18,0.55) 0%, rgba(10,12,18,0.92) 60%, var(--bg) 100%), url(/atmos/carrier.webp)", backgroundSize: "cover", backgroundPosition: "center top", backgroundRepeat: "no-repeat" }}>
      <section className="carrier-hero">
        <span className="kicker">⬡ CARRIER PROTOCOL · HOLD THE SIGNAL</span>
        <h1>
          Holders own citizens<br />
          <em>Carriers hold the signal</em>
        </h1>
        <p className="lead">
          We&apos;re building the city together. Sign in with X, relay today&apos;s
          signal, claim your hex. Every post resets the 14-day decay timer and keeps
          your passive baseline alive. Skip too many days and the meter pauses until
          you carry again.
        </p>
      </section>
      <CarrierClient />
      <section className="carrier-next" style={{ maxWidth: 1200, margin: "var(--s-6) auto 0", padding: "0 var(--s-4)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <p style={{ color: "var(--ink-2)", margin: "var(--s-2) 0 var(--s-3)" }}>
          Carrying isn&rsquo;t the only path. Burn ⬡ for a permanent name on a citizen.
        </p>
        <a className="btn btn-primary" href="/patrons">
          <span className="ttl">BURN HEX FOR YOUR NAME →</span>
        </a>
      </section>
    </div>
  );
}

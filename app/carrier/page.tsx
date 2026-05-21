import type { Metadata } from "next";
import { CarrierClient } from "./CarrierClient";

export const metadata: Metadata = {
  title: "Carrier Rank · Hold the signal · FREELON CITY",
  description: "Holders own citizens. Carriers hold the signal. Daily decay. No reset. The city remembers.",
};

export default function CarrierPage() {
  return (
    <main className="carrier-page" style={{ backgroundImage: "linear-gradient(180deg, rgba(10,12,18,0.55) 0%, rgba(10,12,18,0.92) 60%, var(--bg) 100%), url(/atmos/carrier.webp)", backgroundSize: "cover", backgroundPosition: "center top", backgroundRepeat: "no-repeat" }}>
      <section className="carrier-hero">
        <span className="kicker">⬡ CARRIER PROTOCOL · NON-HOLDER STATUS</span>
        <h1>
          Holders own citizens.<br />
          <em>Carriers hold the signal.</em>
        </h1>
        <p className="lead">
          Sync your handle. Relay the signal daily. Your rank climbs from <strong>DARK</strong> to <strong>BEARER</strong> the more you transmit.
          Skip a day, the signal decays. The city remembers who carried it.
        </p>
      </section>
      <CarrierClient />
    </main>
  );
}

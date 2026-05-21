import type { Metadata } from "next";
import { CivValueChart } from "@/components/CivValueChart";
import { HexNetWorth } from "@/components/HexNetWorth";

export const metadata: Metadata = {
  title: "Dashboard · Civ value + Hex Net Worth · FREELON CITY",
  description: "Per-civilization collection value, your Hex Net Worth, the city's economic state.",
};

export default function Dashboard() {
  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <span className="kicker">⬡ FREELON CITY · ECONOMIC LAYER</span>
        <h1>The <em>numbers.</em></h1>
        <p className="lead">Live floor × civilization population × your holdings. The city, valued.</p>
      </section>
      <HexNetWorth />
      <CivValueChart />
    </main>
  );
}

import type { Metadata } from "next";
import { SignalUniverse } from "@/components/SignalUniverse";

export const metadata: Metadata = {
  title: "Your Signal · across the universe",
  description:
    "Everything you carry across the six collections of the Crypt — Citizens, Dead Signals, Combat Relics, Ancient Species, Memory Fragments, Collapse Records — in one record.",
};

// Reads the viewer cookie + scans OpenSea live on the client; nothing to
// pre-render server-side.
export const dynamic = "force-dynamic";

export default function SignalPage() {
  return (
    <div className="signal-page">
      <SignalUniverse />
    </div>
  );
}

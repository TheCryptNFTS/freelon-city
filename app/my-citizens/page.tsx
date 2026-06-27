import type { Metadata } from "next";
import { MyCitizens } from "@/components/MyCitizens";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Citizens · Your roster",
  description:
    "Every FREELON you hold in one place — which agents you've activated, how many premium runs each has left, and what they've been working on.",
  // Personalized, wallet-gated roster — nothing for a crawler to index, and it
  // would surface as a thin/duplicate page. Keep it out of the index.
  robots: { index: false, follow: true },
};

export default function MyCitizensPage() {
  return <MyCitizens />;
}

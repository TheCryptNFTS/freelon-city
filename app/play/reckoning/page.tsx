import type { Metadata } from "next";
import { Reckoning } from "./Reckoning";

export const metadata: Metadata = {
  title: "The Reckoning · FREELON CITY",
  description:
    "The weekly civ-vs-civ war. Ten civilizations, one crown a week. Burn hex to muster for your side — holders amplify the signal. The civ with the most war signal when the week ends is crowned.",
  openGraph: {
    title: "The Reckoning · FREELON CITY",
    description:
      "Ten civilizations. One crown a week. Burn for your side — the city remembers who won.",
    images: [
      { url: "/api/og/play?t=THE%20RECKONING&k=CIV%20VS%20CIV%20%C2%B7%20WEEKLY%20WAR", width: 1200, height: 630 },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Reckoning · FREELON CITY",
    description: "Ten civilizations. One crown a week. Which civ do you bleed for?",
    images: ["/api/og/play?t=THE%20RECKONING&k=CIV%20VS%20CIV%20%C2%B7%20WEEKLY%20WAR"],
  },
};

export default function ReckoningPage() {
  return <Reckoning />;
}

import type { Metadata } from "next";
import { HexMatch } from "./HexMatch";

export const metadata: Metadata = {
  title: "Hex Match · FREELON CITY Arcade",
  description:
    "Swap the glowing hex-eyes, line up three, chain combos. The free skill hook for FREELON CITY. No wallet required.",
  openGraph: {
    title: "Hex Match · FREELON CITY",
    description: "Swap the glowing hex-eyes, line up three, chain combos. No wallet required.",
    images: [
      { url: "/api/og/play?t=HEX%20MATCH&k=ARCADE%20%C2%B7%20NO%20WALLET", width: 1200, height: 630 },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hex Match · FREELON CITY",
    description: "Line up the signal. Chain the combos.",
    images: ["/api/og/play?t=HEX%20MATCH&k=ARCADE%20%C2%B7%20NO%20WALLET"],
  },
};

export default function HexMatchPage() {
  return <HexMatch />;
}

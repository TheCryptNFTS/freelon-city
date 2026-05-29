import type { Metadata } from "next";
import { ProofOfSignal } from "./ProofOfSignal";

export const metadata: Metadata = {
  title: "Proof of Signal · FREELON CITY",
  description:
    "The daily transmission. One hidden frequency a day, four signals from the ten doctrines — tune to it in eight tries. Same puzzle for everyone, no wallet needed.",
  openGraph: {
    title: "Proof of Signal · FREELON CITY",
    description:
      "One hidden frequency a day. Tune to it in eight tries. The daily puzzle of FREELON CITY.",
    images: [
      { url: "/api/og/play?t=PROOF%20OF%20SIGNAL&k=THE%20DAILY%20TRANSMISSION", width: 1200, height: 630 },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Proof of Signal · FREELON CITY",
    description: "One hidden frequency a day. Can you still receive?",
    images: ["/api/og/play?t=PROOF%20OF%20SIGNAL&k=THE%20DAILY%20TRANSMISSION"],
  },
};

export default function ProofPage() {
  return <ProofOfSignal />;
}

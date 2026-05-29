import type { Metadata } from "next";
import { Cipher } from "./Cipher";

export const metadata: Metadata = {
  title: "The Cipher · FREELON CITY ARG",
  description:
    "Five fragments of a lost transmission, scattered across the lore. Decode each to reassemble what the city was trying to say.",
  openGraph: {
    title: "The Cipher · FREELON CITY",
    description: "Five fragments of a lost transmission. Decode them. Reassemble the signal.",
    images: [
      { url: "/api/og/play?t=THE%20CIPHER&k=ARG%20%C2%B7%20DECODE%20THE%20SIGNAL", width: 1200, height: 630 },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Cipher · FREELON CITY",
    description: "A transmission broke apart. Reassemble it.",
    images: ["/api/og/play?t=THE%20CIPHER&k=ARG%20%C2%B7%20DECODE%20THE%20SIGNAL"],
  },
};

export default function CipherPage() {
  return <Cipher />;
}

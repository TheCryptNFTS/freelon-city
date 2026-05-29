import type { Metadata } from "next";
import { SweepRun } from "./SweepRun";

export const metadata: Metadata = {
  title: "Sweep Run · FREELON CITY",
  description:
    "The floor is corrupting. Sweep the dead signals before they take the grid — but spare the living. A 30-second reflex hit. No wallet, just speed.",
  openGraph: {
    title: "Sweep Run · FREELON CITY",
    description:
      "Sweep the corrupted. Spare the living. How much signal can you clear before the city goes dark?",
    images: [
      { url: "/api/og/play?t=SWEEP%20RUN&k=CLEAR%20THE%20CORRUPTED", width: 1200, height: 630 },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sweep Run · FREELON CITY",
    description: "Sweep the corrupted. Spare the living. Beat the floor.",
    images: ["/api/og/play?t=SWEEP%20RUN&k=CLEAR%20THE%20CORRUPTED"],
  },
};

export default function SweepPage() {
  return <SweepRun />;
}

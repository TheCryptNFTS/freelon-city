import type { Metadata } from "next";
import { RestoreSignal } from "./RestoreSignal";

export const metadata: Metadata = {
  title: "Restore the Signal · FREELON CITY",
  description:
    "The city went dark at 404. Bring nodes online, generate signal, relight the ten civilizations. Holders compound.",
  openGraph: {
    title: "Restore the Signal · FREELON CITY",
    description: "The city went dark at 404. Relight the ten civilizations. Holders compound.",
    images: [
      { url: "/api/og/play?t=RESTORE%20THE%20SIGNAL&k=IDLE%20%C2%B7%20THE%20CITY%20IS%20DARK", width: 1200, height: 630 },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Restore the Signal · FREELON CITY",
    description: "The city is dark. Bring it back online.",
    images: ["/api/og/play?t=RESTORE%20THE%20SIGNAL&k=IDLE%20%C2%B7%20THE%20CITY%20IS%20DARK"],
  },
};

export default function RestorePage() {
  return <RestoreSignal />;
}

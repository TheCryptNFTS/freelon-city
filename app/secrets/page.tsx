import type { Metadata } from "next";
import { SecretsClient } from "./SecretsClient";

export const metadata: Metadata = {
  title: "/secrets · five signals · FREELON CITY",
  description: "Five hidden signals in the city. No spoilers.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <SecretsClient />;
}

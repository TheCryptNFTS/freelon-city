import type { Metadata } from "next";
import { FifthBracketClient } from "./FifthBracketClient";

export const metadata: Metadata = {
  title: "404 — HEX NOT FOUND",
  description: "The page does not exist.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FifthBracketClient />;
}

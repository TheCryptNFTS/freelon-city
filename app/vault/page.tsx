import type { Metadata } from "next";
import { VaultClient } from "@/components/VaultClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vault · Safe Transfer · FREELON CITY",
  description:
    "Move your FREELON citizens safely. Batch-transfer to cold storage, consolidate wallets, or gift — one transaction per citizen, with test-send safeguards.",
};

export default function VaultPage() {
  return <VaultClient />;
}

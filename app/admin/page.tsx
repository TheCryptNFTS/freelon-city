import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata: Metadata = {
  title: "Admin Console",
  robots: { index: false, follow: false }, // keep it out of search engines
};

// Client-driven, key-gated console — never static-prerender it at build time.
export const dynamic = "force-dynamic";

/**
 * /admin — a plain-English founder console. Not a public page: it's gated by the
 * same ADMIN_SEED_KEY as the admin APIs. You type the key once (kept in your
 * browser, never in the URL) and it shows: today's agent cost, recent errors,
 * the go-live readiness checklist, and the payment master switch state.
 *
 * Everything here is READ-ONLY — it reports state, it never changes payments or
 * runs anything. Built for someone new to ops: no raw JSON, no dev URLs.
 */
export default function AdminPage() {
  return <AdminConsole />;
}

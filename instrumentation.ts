/**
 * Next.js server instrumentation — initializes Sentry ONLY when a DSN is set.
 * No SENTRY_DSN → this is a no-op, so the app runs identically with or without
 * monitoring configured (safe to ship before signing up at sentry.io).
 *
 * To enable: set SENTRY_DSN in the environment (Vercel → Settings → Env Vars).
 * Errors are forwarded via lib/missions/ops-log.ts → recordError().
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // monitoring off until a DSN is provided
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn,
      // Conservative defaults — errors only, light tracing. Tune later if wanted.
      tracesSampleRate: 0.1,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    });
  } catch {
    // @sentry/nextjs missing or failed to init — never block startup.
  }
}

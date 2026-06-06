// Custom-event tracking — thin wrapper over Plausible.
//
// Plausible's script.js exposes window.plausible() once it loads. We define
// the standard queue stub so events fired before the script is ready (or when
// the script is disabled because NEXT_PUBLIC_PLAUSIBLE_DOMAIN is unset) are
// simply queued and harmlessly dropped — never a thrown error. No cookies, no
// personal data: pass only coarse, non-identifying props.
type EventProps = Record<string, string | number | boolean>;

export function trackEvent(name: string, props?: EventProps): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    plausible?: ((n: string, o?: { props?: EventProps }) => void) & { q?: unknown[] };
  };
  w.plausible =
    w.plausible ||
    function (...args: unknown[]) {
      (w.plausible!.q = w.plausible!.q || []).push(args);
    };
  w.plausible(name, props ? { props } : undefined);
}

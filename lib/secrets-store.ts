// Easter-egg discovery state — fully client-side. localStorage-backed.
// Tracks which secret signals a visitor has discovered.

const KEY = "freelon::secrets::v1";

export type SecretsState = {
  // Easter egg 1 — typed 0404 anywhere on the site
  code0404: boolean;
  // Easter egg 2 — civilizations visited (set of civ slugs as array)
  civsSeen: string[];
  // Easter egg 3 — caught the 04:04 UTC ghost transmission
  ghost404: boolean;
  // Easter egg 4 — discovered /the-fifth-bracket
  fifthBracket: boolean;
  // Easter egg 5 — unlocked a token-gated honorary channel (handles found)
  channels: string[];
};

const EMPTY: SecretsState = {
  code0404: false,
  civsSeen: [],
  ghost404: false,
  fifthBracket: false,
  channels: [],
};

export function loadSecrets(): SecretsState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<SecretsState>;
    return {
      ...EMPTY,
      ...parsed,
      civsSeen: Array.isArray(parsed.civsSeen) ? parsed.civsSeen : [],
      channels: Array.isArray(parsed.channels) ? parsed.channels : [],
    };
  } catch {
    return EMPTY;
  }
}

function save(s: SecretsState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function markCode0404(): SecretsState {
  const s = loadSecrets();
  if (s.code0404) return s;
  const next = { ...s, code0404: true };
  save(next);
  return next;
}

export function markCivSeen(slug: string): SecretsState {
  const s = loadSecrets();
  if (s.civsSeen.includes(slug)) return s;
  const next = { ...s, civsSeen: [...s.civsSeen, slug] };
  save(next);
  return next;
}

export function markGhost404(): SecretsState {
  const s = loadSecrets();
  if (s.ghost404) return s;
  const next = { ...s, ghost404: true };
  save(next);
  return next;
}

export function markFifthBracket(): SecretsState {
  const s = loadSecrets();
  if (s.fifthBracket) return s;
  const next = { ...s, fifthBracket: true };
  save(next);
  return next;
}

export function markChannel(handle: string): SecretsState {
  const h = handle.replace(/^@/, "").toLowerCase();
  const s = loadSecrets();
  if (s.channels.includes(h)) return s;
  const next = { ...s, channels: [...s.channels, h] };
  save(next);
  return next;
}

export function totalDiscovered(s: SecretsState): number {
  let n = 0;
  if (s.code0404) n++;
  if (s.civsSeen.length >= 10) n++;
  if (s.ghost404) n++;
  if (s.fifthBracket) n++;
  if (s.channels.length > 0) n++;
  return n;
}

/**
 * Crypt PvP bearer-token session.
 *
 * The game client runs on a SEPARATE ORIGIN, so cookies are unusable
 * (SameSite + isSameOrigin/CSRF would break). Instead auth is a Bearer token:
 *   Authorization: Bearer <token>
 *
 * The token is an HMAC-signed payload using the SAME codec shape as
 * lib/x-session.ts (base64url(payload).base64url(HMAC-SHA256), timingSafeEqual,
 * exp check) but under a NEW domain-separating tag (`crypt-game`) so a
 * crypt-game token can never be substituted for an x-session token or vice
 * versa.
 *
 * Revocability: alongside the stateless HMAC we ALSO persist a stateful Upstash
 * record `freelon:gameSession:v1:<addr>` ({ token, address, exp }, ~24h TTL).
 * `verifyBearer` confirms BOTH the HMAC AND that the stored record still exists
 * and matches — so deleting the record is a server-side kill-switch.
 *
 * This session carries ZERO ledger authority. It only proves "this wallet
 * signed a fresh login challenge". No hex/economy code reads it.
 */

import crypto from "node:crypto";
import { upstash, hasUpstash } from "@/lib/upstash-client";
import { isValidAddress } from "@/lib/wallet-tokens";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_TTL_SEC = Math.floor(SESSION_TTL_MS / 1000);

const RECORD_KEY = (addr: string) => `freelon:gameSession:v1:${addr.toLowerCase()}`;

export type GameSessionPayload = {
  /** Lowercased wallet address this token authenticates. */
  address: string;
  exp: number;
};

type StoredSession = {
  token: string;
  address: string;
  exp: number;
};

/**
 * HMAC secret. Reuses X_OAUTH_CLIENT_SECRET (always present in prod) but with a
 * DISTINCT domain tag from x-session, so the derived key differs and tokens are
 * not cross-usable. Falls back to a dev-only secret so localhost (no OAuth env)
 * still works; prod always has the real secret.
 */
function secret(): Buffer {
  const real = process.env.X_OAUTH_CLIENT_SECRET || process.env.GAME_SESSION_SECRET;
  // SECURITY: never let production fall back to the public dev secret — that
  // would let anyone forge a bearer for any address (full auth bypass). Hard-fail
  // at boot/first-use if neither real secret is set in prod.
  if (!real) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      throw new Error(
        "game-session: missing X_OAUTH_CLIENT_SECRET / GAME_SESSION_SECRET in production — refusing the insecure dev fallback.",
      );
    }
  }
  const s = real || "dev-insecure-crypt-game-secret";
  return crypto.createHash("sha256").update(`freelon:crypt-game:v1:${s}`).digest();
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function signToken(payload: GameSessionPayload): string {
  const payloadStr = JSON.stringify(payload);
  const payloadB = Buffer.from(payloadStr, "utf8");
  const mac = crypto.createHmac("sha256", secret()).update(payloadB).digest();
  return `${b64url(payloadB)}.${b64url(mac)}`;
}

/** HMAC-verify + exp-check ONLY (stateless). Returns payload or null. */
function verifyTokenHmac(token: string | undefined | null): GameSessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const [p, m] = token.split(".");
  if (!p || !m) return null;
  let payloadB: Buffer;
  let macB: Buffer;
  try {
    payloadB = b64urlDecode(p);
    macB = b64urlDecode(m);
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", secret()).update(payloadB).digest();
  if (expected.length !== macB.length) return null;
  if (!crypto.timingSafeEqual(expected, macB)) return null;
  let payload: GameSessionPayload;
  try {
    payload = JSON.parse(payloadB.toString("utf8")) as GameSessionPayload;
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  if (!payload.address || typeof payload.address !== "string") return null;
  return payload;
}

async function getStored(addr: string): Promise<StoredSession | null> {
  const a = addr.toLowerCase();
  if (!hasUpstash) return memory.get(RECORD_KEY(a)) ?? null;
  try {
    const raw = (await upstash(["GET", RECORD_KEY(a)])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

const memory = new Map<string, StoredSession>();

/**
 * Mint a session for `address`: sign an HMAC bearer AND persist the stateful
 * record (for revocability). Returns the token + expiry.
 */
export async function mintSession(
  address: string,
): Promise<{ token: string; address: string; expiresAt: number }> {
  const addr = address.toLowerCase();
  const exp = Date.now() + SESSION_TTL_MS;
  const token = signToken({ address: addr, exp });
  const rec: StoredSession = { token, address: addr, exp };
  if (!hasUpstash) {
    memory.set(RECORD_KEY(addr), rec);
  } else {
    await upstash(["SET", RECORD_KEY(addr), JSON.stringify(rec), "EX", String(SESSION_TTL_SEC)]);
  }
  return { token, address: addr, expiresAt: exp };
}

/** Server-side kill-switch: delete the stored record so the token stops working. */
export async function revokeSession(address: string): Promise<void> {
  const addr = address.toLowerCase();
  if (!hasUpstash) {
    memory.delete(RECORD_KEY(addr));
    return;
  }
  try {
    await upstash(["DEL", RECORD_KEY(addr)]);
  } catch {
    /* expires on its own */
  }
}

/**
 * Verify a request's Bearer token: HMAC-verify + exp-check + confirm the
 * stateful Upstash record still exists AND matches the token (kill-switch).
 * Returns `{ address }` (lowercased) or null.
 */
export async function verifyBearer(req: Request): Promise<{ address: string } | null> {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();

  const payload = verifyTokenHmac(token);
  if (!payload) return null;
  if (!isValidAddress(payload.address)) return null;

  // Kill-switch: the stateful record must still exist and bind this exact token.
  const stored = await getStored(payload.address);
  if (!stored) return null;
  if (stored.token !== token) return null;
  if (typeof stored.exp !== "number" || stored.exp < Date.now()) return null;

  return { address: payload.address.toLowerCase() };
}

/**
 * Deterministic `Issued At` derived from the nonce. Both the client and the
 * server compute this from the same nonce, so neither has to round-trip a
 * wall-clock timestamp to agree on the message text. The nonce's own 5-minute
 * TTL is the real freshness bound; this field just satisfies the EIP-4361
 * shape. Exported so the game client builds the identical message.
 */
export function nonceIssuedAt(nonce: string): string {
  // Stable per-nonce, identical on both sides. Epoch 0 keeps it constant.
  void nonce;
  return new Date(0).toISOString();
}

/**
 * The EIP-4361-shaped message a wallet signs to authenticate. Built identically
 * on /api/auth/verify from the STORED nonce — the client never supplies the
 * message string, so it cannot smuggle a different statement past the verifier.
 * The client rebuilds it via the SAME exported `buildAuthMessage(address,
 * nonce, nonceIssuedAt(nonce))`.
 */
export function buildAuthMessage(address: string, nonce: string, issuedAt: string): string {
  const domain = "freeloncity.com";
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Authenticate to Crypt PvP. This does not move funds or hex.",
    "",
    `URI: https://${domain}`,
    "Version: 1",
    "Chain ID: 1",
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

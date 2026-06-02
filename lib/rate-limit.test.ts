/**
 * Rate-limit security tests, focused on the untrusted "unknown" shared bucket.
 *
 * Runs against the in-memory fallback (no Upstash env in dev/test). Each test
 * uses a unique route name so the module-level memory Map can't bleed between
 * cases. Trusted x-real-ip is the Vercel prod path and must keep the full max.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { limit, getIp } from "./rate-limit";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/x", { headers });
}

let n = 0;
const route = () => `test:rl:${n++}:${Math.random().toString(36).slice(2)}`;

describe("getIp identity resolution", () => {
  afterEach(() => {
    delete process.env.RATE_LIMIT_TRUST_XFF;
  });

  it("returns trusted x-real-ip verbatim (Vercel prod path)", () => {
    expect(getIp(req({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("does NOT trust XFF by default, landing in an unknown bucket", () => {
    const ip = getIp(req({ "x-forwarded-for": "1.2.3.4" }));
    expect(ip.startsWith("unknown")).toBe(true);
    expect(ip).not.toContain("1.2.3.4");
  });

  it("trusts leftmost XFF only when RATE_LIMIT_TRUST_XFF==='true'", () => {
    process.env.RATE_LIMIT_TRUST_XFF = "true";
    expect(getIp(req({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
  });

  it("x-real-ip wins over XFF even when XFF is trusted", () => {
    process.env.RATE_LIMIT_TRUST_XFF = "true";
    expect(getIp(req({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "9.9.9.9" }))).toBe(
      "203.0.113.7",
    );
  });

  it("folds UA + leftmost XFF into the unknown key to reduce collateral", () => {
    const a = getIp(req({ "user-agent": "AAA" }));
    const b = getIp(req({ "user-agent": "BBB" }));
    expect(a.startsWith("unknown:")).toBe(true);
    expect(b.startsWith("unknown:")).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("limit() shared-bucket hardening", () => {
  it("keeps the full max for a trusted x-real-ip caller", async () => {
    const r = route();
    let last = await limit(req({ "x-real-ip": "203.0.113.7" }), r, { max: 30 });
    for (let i = 0; i < 28; i++) {
      last = await limit(req({ "x-real-ip": "203.0.113.7" }), r, { max: 30 });
    }
    // 29 requests so far, all under max=30.
    expect(last.ok).toBe(true);
    const thirtieth = await limit(req({ "x-real-ip": "203.0.113.7" }), r, { max: 30 });
    expect(thirtieth.ok).toBe(true);
    const thirtyFirst = await limit(req({ "x-real-ip": "203.0.113.7" }), r, { max: 30 });
    expect(thirtyFirst.ok).toBe(false);
  });

  it("clamps the unknown bucket to a strict fraction of a high max", async () => {
    const r = route();
    // max=60 normally; unknown cap = min(10, ceil(60/5)) = 10.
    const h = { "user-agent": "atk" };
    let blockedAt = -1;
    for (let i = 1; i <= 15; i++) {
      const rl = await limit(req(h), r, { max: 60 });
      if (!rl.ok && blockedAt === -1) blockedAt = i;
    }
    expect(blockedAt).toBe(11); // first 10 ok, 11th blocked
  });

  it("never lets the unknown cap exceed the absolute tiny cap", async () => {
    const r = route();
    // max=30 -> unknown cap = min(10, ceil(30/5)=6) = 6.
    const h = { "user-agent": "atk2" };
    let blockedAt = -1;
    for (let i = 1; i <= 12; i++) {
      const rl = await limit(req(h), r, { max: 30 });
      if (!rl.ok && blockedAt === -1) blockedAt = i;
    }
    expect(blockedAt).toBe(7); // first 6 ok, 7th blocked
  });

  it("a trusted caller is unaffected by an attacker exhausting the unknown bucket", async () => {
    const r = route();
    // Attacker drains the shared unknown bucket.
    for (let i = 0; i < 20; i++) await limit(req({ "user-agent": "flood" }), r, { max: 30 });
    // Legitimate Vercel caller still has its own full allowance.
    const victim = await limit(req({ "x-real-ip": "198.51.100.5" }), r, { max: 30 });
    expect(victim.ok).toBe(true);
    expect(victim.remaining).toBe(29);
  });
});

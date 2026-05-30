import { describe, it, expect } from "vitest";
import {
  RECKONING_SOFTCAP,
  warCurve,
  warPointsMarginal,
} from "@/lib/reckoning-config";

describe("reckoning anti-whale war curve", () => {
  it("is linear up to the soft cap", () => {
    expect(warCurve(0)).toBe(0);
    expect(warCurve(100)).toBe(100);
    expect(warCurve(RECKONING_SOFTCAP)).toBe(RECKONING_SOFTCAP);
  });

  it("is concave (damped) above the soft cap", () => {
    const x = RECKONING_SOFTCAP * 4;
    expect(warCurve(x)).toBeLessThan(x);
    // marginal value of an extra unit shrinks as the total grows
    const m1 = warCurve(RECKONING_SOFTCAP + 100) - warCurve(RECKONING_SOFTCAP);
    const m2 = warCurve(RECKONING_SOFTCAP * 10 + 100) - warCurve(RECKONING_SOFTCAP * 10);
    expect(m2).toBeLessThan(m1);
  });

  it("lets a coalition out-signal a lone whale of equal total hex", () => {
    const total = RECKONING_SOFTCAP * 4;
    // four distinct wallets each at the soft cap → full linear credit each
    const coalition = 4 * warPointsMarginal(0, RECKONING_SOFTCAP, 0);
    // one whale burning the same total into one civ
    const whale = warPointsMarginal(0, total, 0);
    expect(coalition).toBe(total);
    expect(whale).toBeLessThan(coalition);
  });

  it("is split-proof: chopping one burn into many doesn't beat the damping", () => {
    const total = RECKONING_SOFTCAP * 4;
    const oneShot = warPointsMarginal(0, total, 0);
    let prev = 0;
    let split = 0;
    for (let i = 0; i < 4; i++) {
      split += warPointsMarginal(prev, RECKONING_SOFTCAP, 0);
      prev += RECKONING_SOFTCAP;
    }
    // identical up to integer-flooring slack — splitting gains nothing
    expect(Math.abs(split - oneShot)).toBeLessThanOrEqual(4);
    expect(split).toBeLessThan(total);
  });

  it("still applies muster amplification under the soft cap", () => {
    // 50 held citizens → muster capped at +100% (2x)
    expect(warPointsMarginal(0, 100, 50)).toBe(200);
  });

  it("never returns negative or fractional points", () => {
    expect(warPointsMarginal(0, 0, 0)).toBe(0);
    const p = warPointsMarginal(123, 777, 7);
    expect(Number.isInteger(p)).toBe(true);
    expect(p).toBeGreaterThanOrEqual(0);
  });
});

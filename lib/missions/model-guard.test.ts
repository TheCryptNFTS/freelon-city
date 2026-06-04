import { describe, it, expect } from "vitest";
import { abilityModelTier } from "@/lib/missions/abilities/ability";
import { STRATEGY } from "@/lib/missions/abilities/analyst";
import { MAKER } from "@/lib/missions/abilities/maker";
import { COMMUNICATOR } from "@/lib/missions/abilities/communicator";
import { modelFor, MODELS } from "@/lib/missions/models";

describe("cost guard — free runs never use the premium model", () => {
  it("a premium ability runs premium ONLY when paid", () => {
    expect(abilityModelTier(STRATEGY, true)).toBe("strategyMission");
    expect(modelFor(abilityModelTier(STRATEGY, true))).toBe(MODELS.premium);
    // Free run → forced cheap, even though STRATEGY is configured premium.
    expect(abilityModelTier(STRATEGY, false)).toBe("basicConsult");
    expect(modelFor(abilityModelTier(STRATEGY, false))).toBe(MODELS.cheap);
  });

  it("guards a premium-configured FREE ability (Research) down to cheap", () => {
    // COMMUNICATOR (Research) is not priced → always runs free → must be cheap,
    // regardless of its premium modelTask. This is the cost leak the guard kills.
    expect(abilityModelTier(COMMUNICATOR, false)).toBe("basicConsult");
    expect(modelFor(abilityModelTier(COMMUNICATOR, false))).toBe(MODELS.cheap);
  });

  it("a cheap ability stays cheap even when paid", () => {
    expect(abilityModelTier(MAKER, true)).toBe("basicConsult");
  });
});

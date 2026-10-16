import { describe, expect, it } from "vitest";
import { missionPriorities } from "@/config/mission-priorities";

describe("mission-priority contract", () => {
  it("keeps remote income ahead of prestige without inventing an FX conversion", () => {
    expect(missionPriorities.relocation.requiresLocationFlexibleIncome).toBe(true);
    expect(missionPriorities.income.minimumMonthly).toBeGreaterThanOrEqual(0);
    expect(missionPriorities.income.currency).toMatch(/^[A-Z]{3}$/);
    expect(missionPriorities.application.unknownCompensation).toBe("KEEP");
  });
});

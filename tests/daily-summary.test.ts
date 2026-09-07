import { describe, expect, it } from "vitest";
import { missionPriorities } from "@/config/mission-priorities";

describe("mission-priority contract", () => {
  it("keeps remote income ahead of prestige without inventing an FX conversion", () => {
    expect(missionPriorities.relocation.requiresLocationFlexibleIncome).toBe(true);
    expect(missionPriorities.income.minimumMonthly).toBe(70_000);
    expect(missionPriorities.application.unknownCompensation).toBe("KEEP");
  });
});

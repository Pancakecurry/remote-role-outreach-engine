import { describe, expect, it } from "vitest";
import { earlyCareerFit, deterministicEligibility } from "@/services/job-eligibility";

describe("entry-level priority", () => {
  it("uses requirements rather than a misleading Engineer I title", () => {
    expect(earlyCareerFit({ title: "Software Engineer I", description_text: "Minimum 5 years of experience" }).adjustment).toBeLessThan(0);
    expect(earlyCareerFit({ title: "Software Engineer I", description_text: "0-2 years of professional experience" }).adjustment).toBeGreaterThan(0);
  });
  it("does not mistake working with senior engineers for a senior role", () => {
    expect(earlyCareerFit({ title: "Associate Software Engineer", description_text: "Work with senior engineers; 0–2 years of software engineering experience" }).score).toBe(100);
  });
  it("deprioritizes senior roles without deleting their eligibility", () => {
    const job = { title: "Senior AI Engineer", description_text: "Python FastAPI automation", location_text: "India", workplace_type: "REMOTE" };
    expect(deterministicEligibility(job).status).not.toBe("REJECTED");
    expect(deterministicEligibility({ ...job, title: "Junior AI Engineer" }).score).toBeGreaterThan(deterministicEligibility(job).score);
  });
});

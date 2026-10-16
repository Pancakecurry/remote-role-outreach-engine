import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { candidateProfile } from "@/config/candidate-profile";
import { pipelineThresholds } from "@/config/pipeline-thresholds";
import { qualifiesForContactDiscovery, qualifiesForFutureAutosend, qualifiesForManualApplication } from "@/lib/qualification-gates";
import { validateOutreachDraft } from "@/lib/outreach/draft-validation";

const base = { active: true, deterministicStatus: "ELIGIBLE" as const, assessmentStatus: "ASSESSED" as const, fitScore: 74, confidence: 0.72, remoteEligibility: "ELIGIBLE" as const };

describe("stage-specific qualification gates", () => {
  it("keeps manual applications independent of contact intent and contact records", () => {
    expect(qualifiesForManualApplication(base)).toBe(true);
    expect(qualifiesForContactDiscovery(base, true, false)).toBe(false);
  });

  it("preserves hard rejects and allows ambiguous remote work only for review", () => {
    expect(qualifiesForManualApplication({ ...base, deterministicStatus: "REJECTED" })).toBe(false);
    expect(qualifiesForManualApplication({ ...base, deterministicStatus: "REVIEW", remoteEligibility: "MANUAL_REVIEW" })).toBe(true);
    expect(qualifiesForManualApplication({ ...base, remoteEligibility: "INELIGIBLE" })).toBe(false);
    expect(qualifiesForManualApplication({ ...base, compensationBand: "below_target" })).toBe(true);
    expect(qualifiesForManualApplication({ ...base, compensationBand: "unknown" })).toBe(true);
  });

  it("keeps later stages strictly stronger and future autosend evidence-gated", () => {
    expect(pipelineThresholds.application.fitScore).toBeLessThan(pipelineThresholds.contact.fitScore);
    expect(pipelineThresholds.contact.fitScore).toBeLessThan(pipelineThresholds.draft.fitScore);
    expect(pipelineThresholds.draft.fitScore).toBeLessThan(pipelineThresholds.autosend.fitScore);
    expect(qualifiesForFutureAutosend({ ...base, fitScore: 80, confidence: 0.85 }, 0.95, false)).toBe(false);
  });
});

describe("profile and inactive workflow safety", () => {
  it("loads a complete private-or-example profile without weakening claim controls", () => {
    expect(candidateProfile.closingName.length).toBeGreaterThan(0);
    expect(candidateProfile.projects.length).toBeGreaterThan(0);
    expect(candidateProfile.applicationFacts.rag.length).toBeGreaterThan(0);
    expect(candidateProfile.forbiddenClaims.length).toBeGreaterThan(0);
  });

  it("keeps all n8n workflow templates inactive and credential-free", async () => {
    const directory = join(process.cwd(), "n8n", "workflows");
    const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));
    expect(files).toEqual(["remote_role_acquisition_engine.json"]);
    for (const file of files) {
      const source = await readFile(join(directory, file), "utf8");
      expect(JSON.parse(source).active).toBe(false);
      expect(source).not.toMatch(/credentialId|client_secret|refresh_token/i);
    }
    const legacyFiles = (await readdir(join(process.cwd(), "n8n", "legacy-workflows"))).filter((file) => file.endsWith(".json"));
    expect(legacyFiles).toHaveLength(10);
  });

  it("keeps the self-test workflow isolated behind a single-message Gmail path", async () => {
    const source = await readFile(join(process.cwd(), "n8n", "workflows", "remote_role_acquisition_engine.json"), "utf8");
    expect(source).toContain("self-test-prepare");
    expect(source).toContain("self-test-claim");
    expect(source).toContain("self-test-event");
    expect(source).toContain("n8n-nodes-base.gmail");
    expect(source).toContain("batchSize");
  });

  it("rejects drafts that make forbidden or unsupported claims", () => {
    const body = Array(80).fill("evidence").join(" ");
    const followup = Array(35).fill("followup").join(" ");
    const result = validateOutreachDraft({ subject: "Hello", recipientFirstName: "Team", openingReason: "Role", roleReference: "Role", relevantEvidence: "Evidence", bodyText: `${body} invented candidate claim`, bodyHtml: "<p />", followupOne: followup, followupTwo: followup, factualClaimsUsed: ["invented claim"], sourceFacts: ["Official application portal recorded", "Public contact evidence stored"], confidence: 0.8, requiresHumanReview: false }, { applicationStatus: "NOT_STARTED", recipientName: null, companyName: "Example" });
    expect(result.valid).toBe(false);
  });
});

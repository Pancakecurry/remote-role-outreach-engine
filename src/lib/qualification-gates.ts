import { pipelineThresholds } from "@/config/pipeline-thresholds";

export type QualificationGateCandidate = {
  active: boolean;
  deterministicStatus: "ELIGIBLE" | "REVIEW" | "REJECTED" | "PENDING";
  assessmentStatus: "ASSESSED" | "FAILED" | "PENDING" | "SKIPPED";
  fitScore: number | null;
  confidence: number | null;
  remoteEligibility: "ELIGIBLE" | "MANUAL_REVIEW" | "INELIGIBLE" | null;
  compensationBand?: "below_target" | "acceptable" | "strong" | "exceptional" | "unknown" | null;
};

const passes = (candidate: QualificationGateCandidate, threshold: { fitScore: number; confidence: number }) =>
  candidate.active &&
  candidate.deterministicStatus !== "REJECTED" &&
  candidate.assessmentStatus === "ASSESSED" &&
  (candidate.fitScore ?? 0) >= threshold.fitScore &&
  (candidate.confidence ?? 0) >= threshold.confidence;

/** Contact availability and Gemini shouldContact are intentionally absent here. */
export const qualifiesForManualApplication = (candidate: QualificationGateCandidate) =>
  passes(candidate, pipelineThresholds.application) && candidate.remoteEligibility !== "INELIGIBLE";

export const qualifiesForContactDiscovery = (candidate: QualificationGateCandidate, geminiEligible: boolean, shouldContact: boolean) =>
  passes(candidate, pipelineThresholds.contact) &&
  candidate.deterministicStatus === "ELIGIBLE" &&
  candidate.remoteEligibility !== "INELIGIBLE" &&
  geminiEligible &&
  shouldContact;

export const qualifiesForDraft = (candidate: QualificationGateCandidate, selectedEligiblePublicContact: boolean) =>
  passes(candidate, pipelineThresholds.draft) && selectedEligiblePublicContact;

export const qualifiesForFutureAutosend = (candidate: QualificationGateCandidate, contactConfidence: number, allSafetyGatesPass: boolean) =>
  passes(candidate, pipelineThresholds.autosend) &&
  contactConfidence >= pipelineThresholds.autosend.contactConfidence &&
  allSafetyGatesPass;

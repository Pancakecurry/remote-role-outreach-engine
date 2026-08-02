import type { JobAssessment, OutreachDraft } from "@/schemas";
export const geminiContract = { phase: 1, mode: "structured_analysis_only", prohibitedInputs: ["phone number", "residential address", "passport details", "relationship details", "relocation plans"], operations: ["synthetic preflight only", "future job assessment", "future outreach drafting"], requiresHumanReviewForOutreach: true } as const;
export type GeminiStructuredResult = JobAssessment | OutreachDraft;

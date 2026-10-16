import { candidateProfile } from "@/config/candidate-profile";
import { outreachDraftSchema, type OutreachDraft } from "@/schemas";

const approvedClaims = new Set<string>(candidateProfile.projects.flatMap((project) => project.evidence));
const forbiddenPatterns = [
  /degree\s+(?:is\s+)?expected|degree\s+incomplete/i,
  /(?:paid\s+customers?|product\s+revenue|funding|awards?|certifications?)/i,
  /(?:advanced\s+)?(?:react|typescript)\s+(?:expert|expertise|advanced)/i,
  /(?:linkedin\s+connection|cold[- ]email\s+deliverability|client\s+efficiency\s+savings)/i,
];

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

export type DraftValidationContext = {
  applicationStatus: string;
  recipientName?: string | null;
  companyName: string;
};

/** Validates generated content before it is persisted; it does not make it sendable. */
export function validateOutreachDraft(value: unknown, context: DraftValidationContext): { valid: true; draft: OutreachDraft } | { valid: false; reasons: string[] } {
  const parsed = outreachDraftSchema.safeParse(value);
  if (!parsed.success) return { valid: false, reasons: ["DRAFT_SCHEMA_INVALID"] };

  const draft = parsed.data;
  const content = [draft.subject, draft.bodyText, draft.followupOne, draft.followupTwo].join("\n");
  const reasons: string[] = [];
  if (wordCount(draft.bodyText) < 80 || wordCount(draft.bodyText) > 130) reasons.push("INITIAL_LENGTH_INVALID");
  if (wordCount(draft.followupOne) < 35 || wordCount(draft.followupOne) > 80 || wordCount(draft.followupTwo) < 35 || wordCount(draft.followupTwo) > 80) reasons.push("FOLLOWUP_LENGTH_INVALID");
  if (draft.factualClaimsUsed.length === 0 || draft.factualClaimsUsed.some((claim) => !approvedClaims.has(claim))) reasons.push("UNSUPPORTED_FACTUAL_CLAIM");
  if (forbiddenPatterns.some((pattern) => pattern.test(content))) reasons.push("FORBIDDEN_PROFILE_CLAIM");
  if (context.applicationStatus !== "APPLIED" && /(?:i|we)\s+(?:have\s+)?(?:applied|submitted (?:an? )?application)/i.test(content)) reasons.push("UNSUPPORTED_APPLICATION_SUBMISSION");
  if (context.recipientName && !content.includes(context.recipientName.split(/\s+/)[0] ?? "")) reasons.push("UNSUPPORTED_RECIPIENT_REFERENCE");
  if (!draft.sourceFacts.includes("Official application portal recorded") || !draft.sourceFacts.includes("Public contact evidence stored")) reasons.push("SOURCE_FACTS_INCOMPLETE");
  return reasons.length ? { valid: false, reasons } : { valid: true, draft };
}

export const draftApprovedClaims = [...approvedClaims];

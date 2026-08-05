"use server";

import { promises as dns } from "node:dns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/current-user";
import { extractContactEvidence } from "@/lib/contact-extraction";
import { isValidEmailSyntax, normalizeEmail } from "@/lib/domain-validation/email";
import { fetchOfficialPublicPage } from "@/lib/security/safe-public-fetch";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { registrableDomain } from "@/lib/domain-resolution";

const sourceTypes = z.enum(["JOB_POSTING_EXPLICIT", "COMPANY_CAREERS_PAGE", "COMPANY_CONTACT_PAGE", "COMPANY_TEAM_PAGE", "COMPANY_ABOUT_PAGE", "COMPANY_SITE_MAILTO", "COMPANY_SITE_VISIBLE_TEXT", "GENERIC_HIRING_INBOX"]);
const inputSchema = z.object({ jobId: z.string().uuid(), email: z.string().email(), contactName: z.string().trim().max(120).optional(), contactTitle: z.string().trim().max(160).optional(), sourceUrl: z.string().url().refine((value) => value.startsWith("https://")), sourceType: sourceTypes, evidenceText: z.string().trim().min(4).max(500) });
export async function addManualPublicEvidence(formData: FormData) {
  const parsed = inputSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return;
  const user = await requireAuthenticatedUser(); const client = await createServerSupabaseClient();
  const { data: job, error: jobError } = await client.from("jobs").select("id,company_id,companies(domain)").eq("id", parsed.data.jobId).eq("owner_id", user.id).maybeSingle();
  const company = Array.isArray(job?.companies) ? job.companies[0] : job?.companies;
  if (jobError || !job || !company?.domain) return;
  let page: { url: string; body: string };
  try { page = await fetchOfficialPublicPage(parsed.data.sourceUrl, company.domain); } catch { return; }
  const email = normalizeEmail(parsed.data.email); if (!isValidEmailSyntax(email)) return;
  const matched = extractContactEvidence(page.body, page.url, company.domain, parsed.data.sourceType).find((item) => item.email === email);
  if (!matched) return;
  let mx = false; try { mx = (await dns.resolveMx(matched.emailDomain)).length > 0; } catch { /* Stored as absent; mailbox probing is never used. */ }
  const { data: candidate, error: candidateError } = await client.from("email_candidates").upsert({ owner_id: user.id, company_id: job.company_id, email, normalized_email: email, is_generic_hiring_inbox: /^(jobs|careers|hiring|talent|recruitment)@/i.test(email), status: "VALIDATED", is_demo: false }, { onConflict: "owner_id,normalized_email" }).select("id").single();
  if (candidateError || !candidate) return;
  const personal = /@(gmail|yahoo|outlook|hotmail)\.com$/i.test(email);
  const { error } = await client.from("contact_evidence").upsert({ owner_id: user.id, email_candidate_id: candidate.id, source_url: page.url, source_type: matched.sourceType, evidence_text: parsed.data.evidenceText, contact_name: parsed.data.contactName || matched.contactName, contact_title: parsed.data.contactTitle || matched.contactTitle, email, company_domain: matched.companyDomain, email_domain: matched.emailDomain, domain_matches: matched.domainMatches, public_explicit: true, confidence: personal || !mx ? "MEDIUM" : matched.confidence, requires_human_review: personal || !mx || matched.requiresHumanReview, autosend_eligible: false, rejection_reasons: [...matched.rejectionReasons, ...(mx ? [] : ["MX_NOT_PRESENT"]), ...(personal ? ["PERSONAL_FREE_MAIL_PROVIDER"] : [])], mx_status: mx ? "PRESENT" : "ABSENT", fetched_at: new Date().toISOString(), owner_created: true, is_demo: false }, { onConflict: "owner_id,email_candidate_id,source_url,email" });
  if (error) return;
  await client.from("integration_events").upsert({ owner_id: user.id, integration: "manual_contact_evidence", event_type: "VALIDATED", status: "SUCCESS", dedup_hash: `manual-evidence:${candidate.id}:${page.url}`, detail: { source: "owner_verified_public_page" } }, { onConflict: "owner_id,integration,dedup_hash" });
  revalidatePath("/contacts");
}

const manualDomainSchema = z.object({ jobId: z.string().uuid(), domain: z.string().trim().min(3).max(253) });
/** Owner-only correction path; it validates the official host but never creates contact evidence. */
export async function setManualCompanyDomain(formData: FormData) {
  const parsed = manualDomainSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return;
  const domain = registrableDomain(parsed.data.domain); if (!domain) return;
  const user = await requireAuthenticatedUser(); const client = await createServerSupabaseClient();
  const { data: job, error: jobError } = await client.from("jobs").select("company_id,companies(domain,domain_confidence)").eq("id", parsed.data.jobId).eq("owner_id", user.id).maybeSingle();
  const company = Array.isArray(job?.companies) ? job.companies[0] : job?.companies;
  if (jobError || !job || !company) return;
  try { await fetchOfficialPublicPage(`https://${domain}/`, domain); } catch { return; }
  const { error } = await client.from("companies").update({ domain, domain_resolution_source: "MANUAL", domain_confidence: "VERIFIED", domain_verified_at: new Date().toISOString(), domain_rejection_reason: null }).eq("id", job.company_id).eq("owner_id", user.id);
  if (error) return;
  await client.from("integration_events").upsert({ owner_id: user.id, integration: "company_domain", event_type: "MANUAL_VERIFIED", status: "SUCCESS", dedup_hash: `manual-domain:${job.company_id}:${domain}`, detail: { manual: true } }, { onConflict: "owner_id,integration,dedup_hash" });
  revalidatePath("/contacts"); revalidatePath(`/jobs/${parsed.data.jobId}`);
}

const evidenceIdSchema = z.object({ evidenceId: z.string().uuid() });
export async function selectSafeRecipient(formData: FormData) {
  const parsed = evidenceIdSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return;
  const user = await requireAuthenticatedUser(); const client = await createServerSupabaseClient(); const { data } = await client.from("contact_evidence").select("email_candidate_id,public_explicit,domain_matches,mx_status,requires_human_review,rejection_reasons").eq("id", parsed.data.evidenceId).eq("owner_id", user.id).maybeSingle();
  if (!data || !data.public_explicit || !data.domain_matches || data.mx_status !== "PRESENT" || data.requires_human_review || data.rejection_reasons.length > 0) return;
  await client.from("contact_evidence").update({ selected_recipient: false }).eq("owner_id", user.id).eq("email_candidate_id", data.email_candidate_id);
  await client.from("contact_evidence").update({ selected_recipient: true, autosend_eligible: false }).eq("owner_id", user.id).eq("id", parsed.data.evidenceId);
  revalidatePath("/contacts");
}
export async function rejectContactCandidate(formData: FormData) {
  const parsed = evidenceIdSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return;
  const user = await requireAuthenticatedUser(); const client = await createServerSupabaseClient(); const { data } = await client.from("contact_evidence").select("email_candidate_id,rejection_reasons").eq("id", parsed.data.evidenceId).eq("owner_id", user.id).maybeSingle();
  if (!data) return; const reasons = [...new Set([...data.rejection_reasons, "OWNER_REJECTED"])];
  await client.from("contact_evidence").update({ selected_recipient: false, autosend_eligible: false, requires_human_review: true, rejection_reasons: reasons }).eq("owner_id", user.id).eq("id", parsed.data.evidenceId);
  await client.from("email_candidates").update({ status: "REJECTED" }).eq("owner_id", user.id).eq("id", data.email_candidate_id);
  revalidatePath("/contacts");
}
export async function markNoSafeContactFound(formData: FormData) {
  const parsed = z.object({ jobId: z.string().uuid() }).safeParse(Object.fromEntries(formData)); if (!parsed.success) return;
  const user = await requireAuthenticatedUser(); const client = await createServerSupabaseClient(); const { data: job } = await client.from("jobs").select("id").eq("id", parsed.data.jobId).eq("owner_id", user.id).maybeSingle(); if (!job) return;
  await client.from("integration_events").upsert({ owner_id: user.id, integration: "contact_discovery", event_type: "NO_SAFE_CONTACT_FOUND", status: "INFO", dedup_hash: `no-safe-contact:${job.id}`, detail: { owner_marked: true } }, { onConflict: "owner_id,integration,dedup_hash" }); revalidatePath("/contacts");
}
export async function removeOwnerCreatedEvidence(formData: FormData) {
  const parsed = evidenceIdSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return;
  const user = await requireAuthenticatedUser(); const client = await createServerSupabaseClient(); const { data } = await client.from("contact_evidence").select("email_candidate_id,owner_created").eq("id", parsed.data.evidenceId).eq("owner_id", user.id).maybeSingle();
  if (!data?.owner_created) return; const { count } = await client.from("outreach_sequences").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("email_candidate_id", data.email_candidate_id); if ((count ?? 0) > 0) return;
  const { error: deleteEvidenceError } = await client.from("contact_evidence").delete().eq("owner_id", user.id).eq("id", parsed.data.evidenceId).eq("owner_created", true);
  if (deleteEvidenceError) return;
  const { count: remainingEvidenceCount } = await client.from("contact_evidence").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("email_candidate_id", data.email_candidate_id);
  if ((remainingEvidenceCount ?? 0) === 0) await client.from("email_candidates").delete().eq("owner_id", user.id).eq("id", data.email_candidate_id);
  revalidatePath("/contacts");
}

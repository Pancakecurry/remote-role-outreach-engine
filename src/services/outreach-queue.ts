import "server-only";

import { randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { deliveryModeAllowsSend } from "@/lib/internal-route";
import { pipelineThresholds } from "@/config/pipeline-thresholds";

type MessageKind = "INITIAL" | "FOLLOWUP_ONE" | "FOLLOWUP_TWO";
const terminal = ["REPLIED", "BOUNCED", "OPTED_OUT", "PAUSED", "CLOSED"];
const claimedState: Record<string, string> = { READY_TO_SEND: "INITIAL_CLAIMED", FOLLOWUP_ONE_DUE: "FOLLOWUP_ONE_CLAIMED", FOLLOWUP_TWO_DUE: "FOLLOWUP_TWO_CLAIMED" };
const messageKind: Record<string, MessageKind> = { READY_TO_SEND: "INITIAL", FOLLOWUP_ONE_DUE: "FOLLOWUP_ONE", FOLLOWUP_TWO_DUE: "FOLLOWUP_TWO" };
const restoredState: Record<string, string> = { INITIAL_CLAIMED: "READY_TO_SEND", FOLLOWUP_ONE_CLAIMED: "FOLLOWUP_ONE_DUE", FOLLOWUP_TWO_CLAIMED: "FOLLOWUP_TWO_DUE" };

export const productionDeliveryEnabled = (settings: { outreach_mode: string; autosend_enabled: boolean } | null) => Boolean(settings && settings.outreach_mode === "live" && settings.autosend_enabled && deliveryModeAllowsSend());

export async function claimOutreachMessages(ownerId: string, limit: number) {
  const db = createAdminSupabaseClient();
  const settings = await db.from("system_settings").select("outreach_mode,autosend_enabled,daily_send_limit").eq("owner_id", ownerId).maybeSingle();
  if (settings.error || !productionDeliveryEnabled(settings.data)) return { claimed: 0, messages: [], reason: "DRY_RUN_AUTOSEND_DISABLED" };
  const sent = await db.from("messages").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("direction", "OUTBOUND").eq("status", "SENT").gte("sent_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
  if (sent.error || (sent.count ?? 0) >= settings.data.daily_send_limit) return { claimed: 0, messages: [], reason: "DAILY_LIMIT_REACHED" };
  const sequences = await db.from("outreach_sequences").select("id,job_id,email_candidate_id,state,followup_count,paused,claim_token,claim_lease_expires_at,jobs!inner(active,fit_score,fit_confidence,selected_for_action,companies!inner(id)),email_candidates!inner(email)").eq("owner_id", ownerId).eq("is_demo", false).eq("is_test", false).eq("paused", false).in("state", Object.keys(claimedState)).order("next_action_at", { ascending: true }).limit(Math.min(limit, 2));
  if (sequences.error) return { claimed: 0, messages: [], reason: "QUEUE_UNAVAILABLE" };
  for (const sequence of sequences.data ?? []) {
    const job = Array.isArray(sequence.jobs) ? sequence.jobs[0] : sequence.jobs; const email = Array.isArray(sequence.email_candidates) ? sequence.email_candidates[0]?.email : sequence.email_candidates?.email;
    if (!job?.active || !job.selected_for_action || (job.fit_score ?? 0) < pipelineThresholds.autosend.fitScore || (job.fit_confidence ?? 0) < pipelineThresholds.autosend.confidence || !email || terminal.includes(sequence.state) || sequence.followup_count > 2) continue;
    const evidence = await db.from("contact_evidence").select("id,confidence,public_explicit,domain_matches,mx_status,requires_human_review,rejection_reasons,autosend_eligible").eq("owner_id", ownerId).eq("email_candidate_id", sequence.email_candidate_id).eq("selected_recipient", true).maybeSingle();
    const safeEvidence = evidence.data && evidence.data.confidence === "VERIFIED_PUBLIC" && evidence.data.public_explicit && evidence.data.domain_matches && evidence.data.mx_status === "PRESENT" && !evidence.data.requires_human_review && evidence.data.rejection_reasons.length === 0;
    const suppressed = await db.from("suppression_entries").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("email", email).eq("active", true);
    if (!safeEvidence || suppressed.error || (suppressed.count ?? 0) > 0) continue;
    const token = randomUUID(); const lease = new Date(Date.now() + 5 * 60_000).toISOString();
    const claimed = await db.from("outreach_sequences").update({ state: claimedState[sequence.state], claim_token: token, claimed_at: new Date().toISOString(), claim_lease_expires_at: lease }).eq("owner_id", ownerId).eq("id", sequence.id).eq("state", sequence.state).or(`claim_token.is.null,claim_lease_expires_at.lt.${new Date().toISOString()}`).select("id").maybeSingle();
    if (claimed.error || !claimed.data) continue;
    const kind = messageKind[sequence.state]; const message = await db.from("messages").select("id,subject,body_text").eq("owner_id", ownerId).eq("sequence_id", sequence.id).eq("kind", kind).eq("status", "DRAFT").eq("draft_validation_status", "VALID").maybeSingle();
    if (!message.data) { await db.from("outreach_sequences").update({ state: sequence.state, claim_token: null, claimed_at: null, claim_lease_expires_at: null }).eq("owner_id", ownerId).eq("id", sequence.id).eq("claim_token", token); continue; }
    return { claimed: 1, messages: [{ sequenceId: sequence.id, messageId: message.data.id, kind, recipient: email, subject: message.data.subject, bodyText: message.data.body_text, claimToken: token }] };
  }
  return { claimed: 0, messages: [], reason: "NO_ELIGIBLE_MESSAGE" };
}

export async function markOutreachSent(ownerId: string, input: { sequenceId: string; messageId: string; claimToken: string; gmailMessageId: string; gmailThreadId: string }) {
  const db = createAdminSupabaseClient(); const settings = await db.from("system_settings").select("outreach_mode,autosend_enabled").eq("owner_id", ownerId).maybeSingle();
  if (!productionDeliveryEnabled(settings.data)) return { updated: 0, reason: "DRY_RUN_AUTOSEND_DISABLED" };
  const sequence = await db.from("outreach_sequences").select("state,followup_count").eq("owner_id", ownerId).eq("id", input.sequenceId).eq("claim_token", input.claimToken).maybeSingle();
  if (!sequence.data) return { updated: 0, reason: "CLAIM_NOT_FOUND" };
  const next = sequence.data.state === "INITIAL_CLAIMED" ? { state: "INITIAL_SENT", followup_count: 0 } : sequence.data.state === "FOLLOWUP_ONE_CLAIMED" ? { state: "FOLLOWUP_ONE_SENT", followup_count: 1 } : sequence.data.state === "FOLLOWUP_TWO_CLAIMED" ? { state: "FOLLOWUP_TWO_SENT", followup_count: 2 } : null;
  if (!next) return { updated: 0, reason: "CLAIM_NOT_SENDABLE" };
  const due = next.followup_count < 2 ? new Date(Date.now() + 3 * 86_400_000).toISOString() : new Date().toISOString();
  const message = await db.from("messages").update({ status: "SENT", sent_at: new Date().toISOString() }).eq("owner_id", ownerId).eq("id", input.messageId).eq("sequence_id", input.sequenceId).eq("status", "DRAFT");
  if (message.error) return { updated: 0, reason: "MESSAGE_UPDATE_FAILED" };
  const updated = await db.from("outreach_sequences").update({ ...next, next_action_at: due, next_followup_at: due, claim_token: null, claimed_at: null, claim_lease_expires_at: null }).eq("owner_id", ownerId).eq("id", input.sequenceId).eq("claim_token", input.claimToken);
  if (updated.error) return { updated: 0, reason: "SEQUENCE_UPDATE_FAILED" };
  await db.from("gmail_thread_references").upsert({ owner_id: ownerId, sequence_id: input.sequenceId, gmail_message_id: input.gmailMessageId, gmail_thread_id: input.gmailThreadId }, { onConflict: "owner_id,gmail_message_id" });
  return { updated: 1 };
}

export async function releaseOutreachClaim(ownerId: string, sequenceId: string, claimToken: string) {
  const db = createAdminSupabaseClient(); const sequence = await db.from("outreach_sequences").select("state").eq("owner_id", ownerId).eq("id", sequenceId).eq("claim_token", claimToken).maybeSingle();
  const restored = sequence.data ? restoredState[sequence.data.state] : null; if (!restored) return { updated: 0 };
  const result = await db.from("outreach_sequences").update({ state: restored, claim_token: null, claimed_at: null, claim_lease_expires_at: null }).eq("owner_id", ownerId).eq("id", sequenceId).eq("claim_token", claimToken);
  return { updated: result.error ? 0 : 1 };
}

export async function scheduleDueFollowups(ownerId: string) {
  const db = createAdminSupabaseClient(); const settings = await db.from("system_settings").select("outreach_mode,autosend_enabled").eq("owner_id", ownerId).maybeSingle();
  if (!productionDeliveryEnabled(settings.data)) return { due: 0, claimable: 0, reason: "DRY_RUN_AUTOSEND_DISABLED" };
  const timestamp = new Date().toISOString();
  const first = await db.from("outreach_sequences").update({ state: "FOLLOWUP_ONE_DUE" }).eq("owner_id", ownerId).eq("state", "INITIAL_SENT").eq("paused", false).lte("next_action_at", timestamp).lt("followup_count", 1);
  const second = await db.from("outreach_sequences").update({ state: "FOLLOWUP_TWO_DUE" }).eq("owner_id", ownerId).eq("state", "FOLLOWUP_ONE_SENT").eq("paused", false).lte("next_action_at", timestamp).lt("followup_count", 2);
  const closed = await db.from("outreach_sequences").update({ state: "CLOSED", paused: true, next_action_at: null, next_followup_at: null }).eq("owner_id", ownerId).eq("state", "FOLLOWUP_TWO_SENT").eq("paused", false).lte("next_action_at", timestamp);
  return { due: Number(!first.error) + Number(!second.error), claimable: Number(!first.error) + Number(!second.error), closed: Number(!closed.error) };
}

import "server-only";

import { missionPriorities } from "@/config/mission-priorities";
import { dailySummaryEventKey } from "@/lib/daily-summary-key";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const summaryEnabled = () => process.env.DAILY_SUMMARY_ENABLED === "true";
const recipient = () => process.env.DAILY_SUMMARY_RECIPIENT?.trim().toLowerCase() ?? "";
const dayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const startOfToday = () => new Date(`${dayKey()}T00:00:00+05:30`).toISOString();

type CountResult = { count: number | null; error: unknown };
const count = async (query: PromiseLike<CountResult>) => {
  const result = await query;
  if (result.error) throw new Error("SUMMARY_READ_FAILED");
  return result.count ?? 0;
};

export type DailySummaryClaim = { claimed: boolean; day: string; recipient?: string; subject?: string; bodyText?: string; reason?: string };

export async function claimDailySummary(ownerId: string): Promise<DailySummaryClaim> {
  const db = createAdminSupabaseClient(); const day = dayKey(); const dedup = dailySummaryEventKey(day);
  const existing = await db.from("integration_events").select("id,status").eq("owner_id", ownerId).eq("integration", "DAILY_SUMMARY").eq("dedup_hash", dedup).maybeSingle();
  if (existing.error) throw new Error("SUMMARY_AUDIT_UNAVAILABLE");
  if (existing.data?.status === "SUCCESS" || existing.data?.status === "INFO") return { claimed: false, day, reason: "ALREADY_CLAIMED_OR_SENT" };
  if (existing.data) {
    const retried = await db.from("integration_events").update({ status: "INFO", detail: { day, state: "CLAIMED" } }).eq("id", existing.data.id).eq("status", "FAILURE").select("id").maybeSingle();
    if (retried.error || !retried.data) return { claimed: false, day, reason: "ALREADY_CLAIMED_OR_SENT" };
  } else {
    const inserted = await db.from("integration_events").insert({ owner_id: ownerId, integration: "DAILY_SUMMARY", event_type: "DAILY_SUMMARY", status: "INFO", dedup_hash: dedup, detail: { day, state: "CLAIMED" } });
    if (inserted.error) return { claimed: false, day, reason: "ALREADY_CLAIMED_OR_SENT" };
  }
  const since = startOfToday();
  const [discovered, applied, sent, followupsSent, replies, interviews, rejections, failures, sourceFailures, packageFailures, followups, drafts, selected, packages, manualWaiting, safeContacts, ownerActions, opportunities] = await Promise.all([
    count(db.from("jobs").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("is_demo", false).gte("first_seen_at", since)),
    count(db.from("jobs").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("is_demo", false).eq("application_status", "APPLIED").gte("applied_at", since)),
    count(db.from("messages").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("direction", "OUTBOUND").eq("status", "SENT").gte("sent_at", since)),
    count(db.from("messages").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("direction", "OUTBOUND").eq("status", "SENT").in("kind", ["FOLLOWUP_ONE", "FOLLOWUP_TWO"]).gte("sent_at", since)),
    count(db.from("messages").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("direction", "INBOUND").gte("created_at", since)),
    count(db.from("jobs").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("application_status", "INTERVIEW").gte("updated_at", since)),
    count(db.from("jobs").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("application_status", "REJECTED").gte("updated_at", since)),
    count(db.from("workflow_runs").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "FAILED").gte("started_at", since)),
    count(db.from("job_source_runs").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "FAILED").gte("created_at", since)),
    count(db.from("application_audit_events").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("event_type", "PACKAGE_FAILED").gte("created_at", since)),
    count(db.from("outreach_sequences").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).in("state", ["FOLLOWUP_ONE_DUE", "FOLLOWUP_TWO_DUE"])),
    count(db.from("outreach_sequences").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("state", "DRAFT_READY").eq("is_demo", false)),
    count(db.from("jobs").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("selected_for_action", true).eq("is_demo", false)),
    count(db.from("application_packages").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).gte("created_at", since)),
    count(db.from("jobs").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("pipeline_status", "manual_apply").eq("is_demo", false)),
    count(db.from("contact_evidence").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("selected_recipient", true).eq("is_demo", false)),
    db.from("jobs").select("title,pipeline_status,next_action,application_url,companies(name)").eq("owner_id", ownerId).in("pipeline_status", ["owner_input_required", "approval_needed"]).eq("active", true).eq("is_demo", false).order("final_priority_score", { ascending: false }).limit(5),
    db.from("jobs").select("title,fit_score,final_priority_score,score_explanation,application_url,companies(name)").eq("owner_id", ownerId).eq("selected_for_action", true).eq("active", true).eq("is_demo", false).order("final_priority_score", { ascending: false }).limit(4),
  ]);
  if (opportunities.error || ownerActions.error) throw new Error("SUMMARY_READ_FAILED");
  const strongest = (opportunities.data ?? []).map((job, index) => { const companies = job.companies as unknown as { name?: string } | { name?: string }[] | null; const company = Array.isArray(companies) ? companies[0]?.name : companies?.name; return `${index + 1}. ${job.title} — ${company ?? "Unknown company"} (fit ${job.fit_score ?? "pending"}, priority ${job.final_priority_score ?? "pending"})\n   Why: ${(job.score_explanation as string[] | null)?.[0] ?? "strong overall match"}\n   ${job.application_url}`; }).join("\n");
  const needsAction = (ownerActions.data ?? []).map((job, index) => `${index + 1}. ${job.title} — ${job.next_action ?? job.pipeline_status}\n   ${job.application_url}`).join("\n");
  const nextActions = [
    replies ? "Reply to new human responses." : null,
    followups ? `Review ${followups} due follow-up${followups === 1 ? "" : "s"}; do not send if the sequence is paused or suppressed.` : null,
    selected ? `Review ${Math.min(selected, 5)} highest-priority manual applications.` : null,
    drafts ? `Review ${drafts} outreach draft${drafts === 1 ? "" : "s"}; public contact evidence is still required.` : null,
    !safeContacts ? "Keep strong jobs visible even where no safe public contact was found." : null,
  ].filter(Boolean);
  const bodyText = [
    `Daily job-search summary — ${day}`,
    "",
    "TODAY",
    `Jobs discovered: ${discovered}\nHigh-fit jobs: ${selected}\nApplication packages generated: ${packages}\nApplications submitted: ${applied}\nManual applications waiting: ${manualWaiting}\nOutreach sent: ${sent}\nFollow-ups sent: ${followupsSent}\nReplies: ${replies}\nInterviews: ${interviews}\nRejections: ${rejections}\nFailures: ${failures + sourceFailures + packageFailures}`,
    "",
    "TOP OPPORTUNITIES", strongest || "No qualified opportunity is currently queued.",
    "",
    "NEEDS MY ACTION", needsAction || (nextActions.length ? nextActions.map((item, index) => `${index + 1}. ${item}`).join("\n") : "Nothing needs owner action."),
    "",
    "SYSTEM HEALTH", `ATS source failures: ${sourceFailures}\nGmail health: ${process.env.OUTREACH_ENABLED === "true" ? "enabled after isolated test" : "sending disabled"}\nWorkflow failures: ${failures}\nPackage-generation failures: ${packageFailures}`,
    "",
    `Mission lens: prefer lawful, location-flexible income. Known compensation below ${missionPriorities.income.currency} ${missionPriorities.income.minimumMonthly.toLocaleString()} per month is deprioritized; undisclosed compensation requires review, not a guess.`,
  ].join("\n");
  const sendAllowed = summaryEnabled() && Boolean(recipient());
  const saved = await db.from("integration_events").update({ detail: { day, state: sendAllowed ? "CLAIMED" : "GENERATED", subject: `Job-search summary — ${day}`, bodyText } }).eq("owner_id", ownerId).eq("integration", "DAILY_SUMMARY").eq("dedup_hash", dedup);
  if (saved.error) throw new Error("SUMMARY_AUDIT_UNAVAILABLE");
  return { claimed: sendAllowed, day, recipient: recipient(), subject: `Job-search summary — ${day}`, bodyText, ...(!sendAllowed ? { reason: "GENERATED_SENDING_DISABLED" } : {}) };
}

export async function markDailySummarySent(ownerId: string, day: string, gmailMessageId: string) {
  const db = createAdminSupabaseClient();
  const update = await db.from("integration_events").update({ status: "SUCCESS", detail: { day, state: "SENT", gmailMessageId: gmailMessageId.slice(0, 500) } }).eq("owner_id", ownerId).eq("integration", "DAILY_SUMMARY").eq("dedup_hash", dailySummaryEventKey(day)).eq("status", "INFO").select("id").maybeSingle();
  return { updated: update.error || !update.data ? 0 : 1 };
}

export async function releaseDailySummaryClaim(ownerId: string, day: string) {
  const db = createAdminSupabaseClient();
  const update = await db.from("integration_events").update({ status: "FAILURE", detail: { day, state: "FAILED" } }).eq("owner_id", ownerId).eq("integration", "DAILY_SUMMARY").eq("dedup_hash", dailySummaryEventKey(day)).eq("status", "INFO").select("id").maybeSingle();
  return { updated: update.error || !update.data ? 0 : 1 };
}

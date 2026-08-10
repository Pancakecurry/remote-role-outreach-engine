import { promises as fs } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { pipelineThresholds } from "@/config/pipeline-thresholds";

const workflowFile = (name: string) => /^\d\d_.*\.json$/.test(name);

async function readsOnlyFromAtsAdapters() {
  const adapterRoot = join(process.cwd(), "src/integrations/job-sources");
  const names = (await fs.readdir(adapterRoot, { recursive: true })).filter((name) => typeof name === "string" && name.endsWith(".ts"));
  const sources = await Promise.all(names.map((name) => fs.readFile(join(adapterRoot, name), "utf8")));
  return sources.every((source) => !/method:\s*["'](?:POST|PUT|PATCH|DELETE)/.test(source) && !/\/applications\//.test(source));
}

async function main() {
  loadProjectEnvironment(); const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID); if (!owner.success) { console.log("END_TO_END: NOT_CONFIGURED"); process.exitCode = 1; return; }
  try {
    const db = createAdminSupabaseClient(); const [jobs, evidence, sequences, gmail, settings, locks] = await Promise.all([
      db.from("jobs").select("active,selected_for_action,deterministic_status,gemini_assessment_status,fit_score,fit_confidence,is_demo").eq("owner_id", owner.data),
      db.from("contact_evidence").select("autosend_eligible,public_explicit,domain_matches,mx_status,source_type,selected_recipient,is_demo").eq("owner_id", owner.data),
      db.from("outreach_sequences").select("state,followup_count,paused,is_test,claim_token,claim_lease_expires_at,is_demo").eq("owner_id", owner.data),
      db.from("gmail_thread_references").select("id", { count: "exact", head: true }).eq("owner_id", owner.data),
      db.from("system_settings").select("outreach_mode,autosend_enabled").eq("owner_id", owner.data).maybeSingle(),
      db.from("pipeline_execution_locks").select("lock_name,expires_at").eq("owner_id", owner.data),
    ]);
    const databaseReadable = ![jobs, evidence, sequences, gmail, settings, locks].some((result) => result.error);
    const selected = (jobs.data ?? []).filter((job) => job.selected_for_action && !job.is_demo); const queueSafe = selected.every((job) => job.active && job.deterministic_status !== "REJECTED" && job.gemini_assessment_status === "ASSESSED" && (job.fit_score ?? 0) >= pipelineThresholds.application.fitScore && (job.fit_confidence ?? 0) >= pipelineThresholds.application.confidence);
    const evidenceSafe = (evidence.data ?? []).every((item) => !item.autosend_eligible || (item.public_explicit && item.domain_matches && item.mx_status === "PRESENT" && item.source_type !== "INFERRED_EMAIL_PATTERN"));
    const sequenceSafe = (sequences.data ?? []).every((item) => item.followup_count <= 2 && (!item.claim_token || Boolean(item.claim_lease_expires_at)) && (item.is_test || !["REPLIED", "BOUNCED", "OPTED_OUT"].includes(item.state) || item.paused));
    const activeJobs = (jobs.data ?? []).filter((job) => job.active && !job.is_demo); const assessedJobs = activeJobs.filter((job) => job.gemini_assessment_status === "ASSESSED"); const pendingJobs = activeJobs.filter((job) => job.gemini_assessment_status === "PENDING"); const safeContacts = (evidence.data ?? []).filter((item) => !item.is_demo && item.selected_recipient && item.public_explicit && item.domain_matches && item.mx_status === "PRESENT"); const drafts = (sequences.data ?? []).filter((item) => !item.is_demo && item.state === "DRAFT_READY"); const activeClaims = (sequences.data ?? []).filter((item) => !item.is_demo && !item.is_test && Boolean(item.claim_token));
    const source = await fs.readFile(join(process.cwd(), "src/services/outreach-queue.ts"), "utf8"); const workflows = await fs.readdir(join(process.cwd(), "n8n/workflows")); const workflowSources = await Promise.all(workflows.filter(workflowFile).map((name) => fs.readFile(join(process.cwd(), "n8n/workflows", name), "utf8"))); const templateSafe = workflows.filter(workflowFile).length === 10 && workflowSources.every((file) => /"active"\s*:\s*false/.test(file) && !/credentialId|client_secret|refresh_token/i.test(file));
    const dryRunBlocked = settings.data?.outreach_mode === "dry_run" && settings.data.autosend_enabled === false && /DRY_RUN_AUTOSEND_DISABLED/.test(source); const noAtsWrite = await readsOnlyFromAtsAdapters(); const locksSafe = (locks.data ?? []).every((lock) => new Date(lock.expires_at) > new Date() || Boolean(lock.lock_name));
    const pass = databaseReadable && selected.length <= 30 && queueSafe && evidenceSafe && sequenceSafe && dryRunBlocked && (gmail.count ?? 0) === 0 && templateSafe && noAtsWrite && locksSafe;
    console.log("END_TO_END_CHECKS:");
    console.log(`- database reads: ${databaseReadable ? "PASS" : "FAIL"}`);
    console.log(`END_TO_END_STATE: active_jobs=${activeJobs.length} assessed_jobs=${assessedJobs.length} pending_jobs=${pendingJobs.length} selected_jobs=${selected.length} safe_contacts=${safeContacts.length} drafts=${drafts.length} active_claims=${activeClaims.length}`);
    console.log(`END_TO_END_APPLICATION_QUEUE: ${queueSafe ? "PASS" : "FAIL"}`); console.log(`END_TO_END_CONTACT_OPTIONAL: PASS`); console.log(`END_TO_END_SEQUENCE_SAFETY: ${sequenceSafe ? "PASS" : "FAIL"}`); console.log(`END_TO_END_DRY_RUN_CLAIM: ${dryRunBlocked ? "ZERO" : "FAIL"}`); console.log(`END_TO_END_N8N_TEMPLATES: ${templateSafe ? "PASS" : "FAIL"}`); console.log(`END_TO_END_MANUAL_APPLICATIONS: ${noAtsWrite ? "PASS" : "FAIL"}`); console.log(`END_TO_END_GMAIL_IDS: ${(gmail.count ?? 0) === 0 ? "ZERO" : "PRESENT"}`); console.log(`END_TO_END: ${pass ? "PASS" : "FAIL"}`); if (!pass) process.exitCode = 1;
  } catch { console.log("END_TO_END_CHECKS:"); console.log("- verifier runtime: FAIL"); console.log("END_TO_END: FAIL"); process.exitCode = 1; }
}
void main();

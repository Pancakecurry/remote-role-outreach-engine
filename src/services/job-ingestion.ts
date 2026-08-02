import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { jobSourceAdapters, jobSourceConfigSchema, type CanonicalIngestedJob, type JobSourceConfig } from "@/integrations/job-sources";
import { missingJobTransition } from "@/lib/job-lifecycle";

type IngestionMode = "dry_run" | "write";
type SourceRow = { id: string; provider: "GREENHOUSE" | "LEVER" | "ASHBY"; company_name: string; company_domain: string; board_identifier: string; provider_region: "GLOBAL" | "EU" | null; enabled: boolean; is_demo: boolean };
export type IngestionStats = { sourcesAttempted: number; sourcesSucceeded: number; sourcesFailed: number; fetched: number; valid: number; malformed: number; inserted: number; updated: number; unchanged: number; reopened: number; newlyMissing: number; closed: number; failed: number; locked: boolean };
const emptyStats = (): IngestionStats => ({ sourcesAttempted: 0, sourcesSucceeded: 0, sourcesFailed: 0, fetched: 0, valid: 0, malformed: 0, inserted: 0, updated: 0, unchanged: 0, reopened: 0, newlyMissing: 0, closed: 0, failed: 0, locked: false });
const urlHash = (value: string) => createHash("sha256").update(new URL(value).toString()).digest("hex");

async function acquireLock(ownerId: string) { const db = createAdminSupabaseClient(); const token = randomUUID(); const { error } = await db.from("job_ingestion_locks").insert({ owner_id: ownerId, lock_token: token }); return error ? null : token; }
async function releaseLock(ownerId: string, token: string) { const db = createAdminSupabaseClient(); await db.from("job_ingestion_locks").delete().eq("owner_id", ownerId).eq("lock_token", token); }
function configFromRow(row: SourceRow): JobSourceConfig | null { const parsed = jobSourceConfigSchema.safeParse({ id: row.id, provider: row.provider, companyName: row.company_name, companyDomain: row.company_domain, boardIdentifier: row.board_identifier, providerRegion: row.provider_region, enabled: row.enabled, isDemo: row.is_demo }); return parsed.success ? parsed.data : null; }

async function upsertJob(ownerId: string, job: CanonicalIngestedJob, sourceRunId: string) {
  const db = createAdminSupabaseClient();
  const company = await db.from("companies").upsert({ owner_id: ownerId, name: job.companyName, domain: job.companyDomain, careers_url: job.postingUrl, status: "ACTIVE", is_demo: false }, { onConflict: "owner_id,domain" }).select("id").single();
  if (company.error || !company.data) throw new Error("COMPANY_UPSERT_FAILED");
  const existing = await db.from("jobs").select("id,raw_payload_hash,active,first_seen_at").eq("owner_id", ownerId).eq("source_id", job.sourceId).eq("external_job_id", job.externalJobId).maybeSingle();
  if (existing.error) throw new Error("JOB_LOOKUP_FAILED");
  const now = new Date().toISOString();
  const row = { owner_id: ownerId, company_id: company.data.id, source_id: job.sourceId, external_job_id: job.externalJobId, provider: job.provider, title: job.title, normalized_title: job.normalizedTitle, description_text: job.descriptionText, description_html: null, location_text: job.locationText, remote_type: job.workplaceType, workplace_type: job.workplaceType, employment_type: job.employmentType, department: job.department, team: job.team, seniority_text: job.seniorityText, country_code: job.countryCode, application_url: job.applicationUrl, posting_url: job.postingUrl, provider_updated_at: job.providerUpdatedAt, published_at: job.publishedAt, first_seen_at: existing.data?.first_seen_at ?? now, last_seen_at: now, last_successful_fetch_id: sourceRunId, active: true, consecutive_missing_runs: 0, closed_at: null, raw_payload_hash: job.payloadHash, normalized_application_url_hash: urlHash(job.applicationUrl), normalized_posting_url_hash: urlHash(job.postingUrl), dedup_hash: job.dedupHash, qualification_status: "PENDING", status: "OPEN", is_demo: false };
  if (!existing.data) { const insert = await db.from("jobs").insert(row); if (insert.error) throw new Error("JOB_INSERT_FAILED"); return "inserted" as const; }
  const wasReopened = !existing.data.active;
  if (existing.data.raw_payload_hash === job.payloadHash && existing.data.active) { const update = await db.from("jobs").update({ last_seen_at: now, last_successful_fetch_id: sourceRunId, consecutive_missing_runs: 0 }).eq("id", existing.data.id).eq("owner_id", ownerId); if (update.error) throw new Error("JOB_TOUCH_FAILED"); return "unchanged" as const; }
  const update = await db.from("jobs").update(row).eq("id", existing.data.id).eq("owner_id", ownerId); if (update.error) throw new Error("JOB_UPDATE_FAILED"); return wasReopened ? "reopened" as const : "updated" as const;
}

async function applyMissingLifecycle(ownerId: string, sourceId: string, seenIds: string[]) {
  const db = createAdminSupabaseClient(); const rows = await db.from("jobs").select("id,external_job_id,consecutive_missing_runs").eq("owner_id", ownerId).eq("source_id", sourceId).eq("active", true).eq("is_demo", false); if (rows.error) throw new Error("MISSING_LIFECYCLE_LOOKUP_FAILED"); let newlyMissing = 0; let closed = 0;
  for (const row of rows.data ?? []) { const transition = missingJobTransition(row.consecutive_missing_runs, true, Boolean(row.external_job_id && seenIds.includes(row.external_job_id))); if (transition.runs === 0) continue; const update = await db.from("jobs").update({ consecutive_missing_runs: transition.runs, active: transition.active, status: transition.closed ? "CLOSED" : "OPEN", closed_at: transition.closed ? new Date().toISOString() : null }).eq("id", row.id).eq("owner_id", ownerId); if (update.error) throw new Error("MISSING_LIFECYCLE_UPDATE_FAILED"); newlyMissing += 1; if (transition.closed) closed += 1; }
  return { newlyMissing, closed };
}

export async function runJobIngestion(ownerId: string, options: { mode: IngestionMode; sourceIds?: string[]; limitSources?: number; maxJobsPerSource?: number }) {
  const stats = emptyStats(); const db = createAdminSupabaseClient(); if (options.mode === "dry_run") return { ...stats, dryRun: true };
  const token = await acquireLock(ownerId); if (!token) return { ...stats, locked: true, dryRun: false };
  try {
    const workflow = await db.from("workflow_runs").insert({ owner_id: ownerId, workflow_name: "phase_3_job_ingestion", status: "RUNNING", dry_run: true, summary: "Public ATS ingestion in dry-run outreach mode.", is_demo: false }).select("id").single(); if (workflow.error || !workflow.data) throw new Error("WORKFLOW_RUN_CREATE_FAILED");
    let query = db.from("job_sources").select("id,provider,company_name,company_domain,board_identifier,provider_region,enabled,is_demo").eq("owner_id", ownerId).eq("enabled", true).eq("is_demo", false).order("priority", { ascending: true });
    if (options.sourceIds?.length) query = query.in("id", options.sourceIds); const sourceResult = await query.limit(Math.min(options.limitSources ?? 50, 50)); if (sourceResult.error) throw new Error("SOURCE_READ_FAILED");
    for (const row of sourceResult.data ?? []) { const config = configFromRow(row as SourceRow); if (!config) continue; stats.sourcesAttempted += 1; const adapter = jobSourceAdapters[config.provider]; const result = await adapter.fetchJobs(config, { maxJobs: options.maxJobsPerSource ?? 250 });
      if (result.requestStatus === "FAILED") { stats.sourcesFailed += 1; stats.failed += 1; await db.from("job_sources").update({ last_attempt_at: result.fetchedAt, last_failure_at: result.fetchedAt, consecutive_failures: 1, last_error_category: result.sanitizedErrorCategory }).eq("id", config.id).eq("owner_id", ownerId); await db.from("job_source_runs").insert({ owner_id: ownerId, workflow_run_id: workflow.data.id, source_id: config.id, provider: config.provider, status: "FAILED", duration_ms: result.durationMs, error_category: result.sanitizedErrorCategory, payload_hash: result.payloadHash }); continue; }
      stats.sourcesSucceeded += 1; stats.fetched += result.totalReceived; stats.valid += result.jobs.length; stats.malformed += result.malformedCount; const run = await db.from("job_source_runs").insert({ owner_id: ownerId, workflow_run_id: workflow.data.id, source_id: config.id, provider: config.provider, status: "SUCCEEDED", fetched_count: result.totalReceived, valid_count: result.jobs.length, malformed_count: result.malformedCount, duration_ms: result.durationMs, payload_hash: result.payloadHash }).select("id").single(); if (run.error || !run.data) throw new Error("SOURCE_RUN_CREATE_FAILED");
      for (const job of result.jobs) { const outcome = await upsertJob(ownerId, job, run.data.id); stats[outcome] += 1; }
      const lifecycle = await applyMissingLifecycle(ownerId, config.id, result.jobs.map((job) => job.externalJobId)); stats.newlyMissing += lifecycle.newlyMissing; stats.closed += lifecycle.closed;
      await db.from("job_sources").update({ last_attempt_at: result.fetchedAt, last_success_at: result.fetchedAt, last_job_count: result.totalReceived, last_payload_hash: result.payloadHash, consecutive_failures: 0, last_error_category: null }).eq("id", config.id).eq("owner_id", ownerId);
      await db.from("job_source_runs").update({ inserted_count: stats.inserted, updated_count: stats.updated, unchanged_count: stats.unchanged, reopened_count: stats.reopened, newly_missing_count: lifecycle.newlyMissing, closed_count: lifecycle.closed }).eq("id", run.data.id);
    }
    await db.from("workflow_runs").update({ status: "SUCCEEDED", completed_at: new Date().toISOString(), summary: `sources=${stats.sourcesAttempted}; valid=${stats.valid}; inserted=${stats.inserted}; updated=${stats.updated}; unchanged=${stats.unchanged}` }).eq("id", workflow.data.id).eq("owner_id", ownerId); return { ...stats, dryRun: false };
  } catch { return { ...stats, failed: stats.failed + 1, dryRun: false }; } finally { await releaseLock(ownerId, token); }
}

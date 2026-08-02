import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { z } from "zod";

const https = (value: string | null) => { try { return value === null || new URL(value).protocol === "https:"; } catch { return false; } };

async function main() {
  loadProjectEnvironment(); const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!owner.success) { console.log("INGESTION_VERIFY: NOT_CONFIGURED"); process.exitCode = 1; return; }
  try {
    const db = createAdminSupabaseClient();
    const [sources, jobs, sourceRuns, contacts, sequences, gmail, settings, workflow] = await Promise.all([
      db.from("job_sources").select("id,provider,enabled,is_demo,public_board_url,last_job_count").eq("owner_id", owner.data).eq("is_demo", false),
      db.from("jobs").select("source_id,external_job_id,provider,application_url,posting_url,first_seen_at,last_seen_at,active,closed_at,qualification_status,is_demo,normalized_application_url_hash").eq("owner_id", owner.data).eq("is_demo", false),
      db.from("job_source_runs").select("source_id,status").eq("owner_id", owner.data),
      db.from("contact_evidence").select("id", { count: "exact", head: true }).eq("owner_id", owner.data).eq("is_demo", false),
      db.from("outreach_sequences").select("id", { count: "exact", head: true }).eq("owner_id", owner.data).eq("is_demo", false),
      db.from("gmail_thread_references").select("id", { count: "exact", head: true }).eq("owner_id", owner.data),
      db.from("system_settings").select("autosend_enabled").eq("owner_id", owner.data).maybeSingle(),
      db.from("workflow_runs").select("status,summary").eq("owner_id", owner.data).eq("workflow_name", "phase_3_job_ingestion").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if ([sources, jobs, sourceRuns, contacts, sequences, gmail, settings, workflow].some((result) => result.error)) throw new Error("READ_FAILED");
    const enabled = (sources.data ?? []).filter((source) => source.enabled); const successfulSources = new Set((sourceRuns.data ?? []).filter((run) => run.status === "SUCCEEDED").map((run) => run.source_id));
    const identities = new Set<string>(); const urls = new Set<string>(); let duplicateIdentity = false; let duplicateUrl = false; let lifecycle = true; let urlsValid = true;
    for (const job of jobs.data ?? []) { const identity = `${job.source_id}:${job.external_job_id}`; if (!job.source_id || !job.external_job_id || identities.has(identity)) duplicateIdentity = true; identities.add(identity); if (job.normalized_application_url_hash && urls.has(job.normalized_application_url_hash)) duplicateUrl = true; urls.add(job.normalized_application_url_hash ?? ""); urlsValid &&= https(job.application_url) && https(job.posting_url); lifecycle &&= Boolean(job.first_seen_at && job.last_seen_at && new Date(job.first_seen_at) <= new Date(job.last_seen_at) && (job.active ? !job.closed_at : Boolean(job.closed_at)) && job.qualification_status === "PENDING"); }
    const origins = (sources.data ?? []).every((source) => source.public_board_url ? /^https:\/\/(boards\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com)\//.test(source.public_board_url) : false);
    const providerCounts = { GREENHOUSE: enabled.filter((source) => source.provider === "GREENHOUSE").length, LEVER: enabled.filter((source) => source.provider === "LEVER").length, ASHBY: enabled.filter((source) => source.provider === "ASHBY").length };
    const sourceRunPass = enabled.every((source) => successfulSources.has(source.id)); const published = enabled.reduce((sum, source) => sum + source.last_job_count, 0); const noSideEffects = (contacts.count ?? 0) === 0 && (sequences.count ?? 0) === 0 && (gmail.count ?? 0) === 0 && settings.data?.autosend_enabled === false;
    const pass = enabled.length > 0 && (jobs.data ?? []).length > 0 && !duplicateIdentity && !duplicateUrl && urlsValid && lifecycle && origins && sourceRunPass && noSideEffects;
    console.log(`INGESTION_ENABLED_SOURCES: ${enabled.length}`); console.log(`INGESTION_SUCCESSFUL_SOURCES: ${enabled.filter((source) => successfulSources.has(source.id)).length}`); console.log(`INGESTION_PUBLISHED_JOB_TOTAL: ${published}`); console.log(`INGESTION_REAL_JOBS: ${(jobs.data ?? []).length}`); console.log(`INGESTION_GREENHOUSE_ENABLED: ${providerCounts.GREENHOUSE}`); console.log(`INGESTION_LEVER_ENABLED: ${providerCounts.LEVER}`); console.log(`INGESTION_ASHBY_ENABLED: ${providerCounts.ASHBY}`); console.log(`INGESTION_PROVIDER_IDENTITIES: ${duplicateIdentity ? "FAIL" : "PASS"}`); console.log(`INGESTION_HTTPS_URLS: ${urlsValid && origins ? "PASS" : "FAIL"}`); console.log(`INGESTION_DEDUPLICATION: ${duplicateUrl ? "DOCUMENT_REVIEW" : "PASS"}`); console.log(`INGESTION_LIFECYCLE: ${lifecycle ? "PASS" : "FAIL"}`); console.log(`INGESTION_NO_SIDE_EFFECTS: ${noSideEffects ? "PASS" : "FAIL"}`); console.log(`INGESTION_VERIFY: ${pass ? "PASS" : "FAIL"}`); if (!pass) process.exitCode = 1;
  } catch { console.log("INGESTION_VERIFY: FAIL"); process.exitCode = 1; }
}
void main();

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { runJobIngestion } from "@/services/job-ingestion";
import { z } from "zod";

async function main() {
  loadProjectEnvironment(); const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID); const mode = process.argv.includes("--dry-run") ? "dry_run" : "write";
  if (!owner.success) { console.log("INGESTION: NOT_CONFIGURED"); process.exitCode = 1; return; }
  let sourceIds: string[] | undefined;
  if (process.argv.includes("--one-per-provider")) {
    const db = createAdminSupabaseClient(); const sources = await db.from("job_sources").select("id,provider").eq("owner_id", owner.data).eq("enabled", true).eq("is_demo", false).order("priority", { ascending: true });
    if (sources.error) { console.log("INGESTION: SOURCE_SELECTION_FAILED"); process.exitCode = 1; return; }
    const seen = new Set<string>(); sourceIds = (sources.data ?? []).filter((source) => source.provider && !seen.has(source.provider) && Boolean(seen.add(source.provider))).map((source) => source.id).slice(0, 3);
  }
  const result = await runJobIngestion(owner.data, { mode, sourceIds, limitSources: sourceIds?.length ?? 50, maxJobsPerSource: 250 });
  console.log(`INGESTION_MODE: ${mode}`); console.log(`INGESTION_SOURCES_ATTEMPTED: ${result.sourcesAttempted}`); console.log(`INGESTION_SOURCES_SUCCEEDED: ${result.sourcesSucceeded}`); console.log(`INGESTION_SOURCES_FAILED: ${result.sourcesFailed}`); console.log(`INGESTION_FETCHED: ${result.fetched}`); console.log(`INGESTION_VALID: ${result.valid}`); console.log(`INGESTION_MALFORMED: ${result.malformed}`); console.log(`INGESTION_INSERTED: ${result.inserted}`); console.log(`INGESTION_UPDATED: ${result.updated}`); console.log(`INGESTION_UNCHANGED: ${result.unchanged}`); console.log(`INGESTION_REOPENED: ${result.reopened}`); console.log(`INGESTION_CLOSED: ${result.closed}`); console.log(`INGESTION_LOCKED: ${result.locked ? "YES" : "NO"}`); if (result.locked || result.failed) process.exitCode = 1;
}
void main();

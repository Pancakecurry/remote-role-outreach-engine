import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { runJobIngestion } from "@/services/job-ingestion";
import { runAssessmentPipeline } from "@/services/assessment-pipeline";
import { discoverContacts, generateDrafts } from "@/services/release-pipeline";

/**
 * The one acquisition transaction boundary. Each stage preserves prior data;
 * a failed stage stops later stages and leaves earlier successful work intact.
 */
export async function runDailyAcquisition(ownerId: string) {
  const db = createAdminSupabaseClient();
  const started = await db.from("workflow_runs").insert({ owner_id: ownerId, workflow_name: "00_remote_role_acquisition_master", status: "RUNNING", dry_run: process.env.OUTREACH_MODE === "dry_run", summary: "ingestion → qualification → contacts → drafts", is_demo: false }).select("id").single();
  if (started.error || !started.data) throw new Error("MASTER_RUN_UNAVAILABLE");
  const runId = started.data.id;
  try {
    const ingestion = await runJobIngestion(ownerId, { mode: "write", maxJobsPerSource: 250 });
    if (ingestion.locked || ingestion.sourcesSucceeded === 0) throw new Error("INGESTION_FAILED");
    const qualification = await runAssessmentPipeline(ownerId, { mode: "incremental", limit: 25 });
    const contacts = await discoverContacts(ownerId, 10, runId);
    const drafts = await generateDrafts(ownerId);
    const summary = `sources=${ingestion.sourcesSucceeded}/${ingestion.sourcesAttempted}; assessed=${qualification.succeeded}; selected=${qualification.selected}; contacts=${contacts.eligible}; drafts=${drafts.drafts}`;
    await db.from("workflow_runs").update({ status: "SUCCEEDED", completed_at: new Date().toISOString(), summary }).eq("id", runId).eq("owner_id", ownerId);
    return { runId, ingestion, qualification, contacts, drafts };
  } catch (error) {
    await db.from("workflow_runs").update({ status: "FAILED", completed_at: new Date().toISOString(), summary: error instanceof Error ? error.message.slice(0, 120) : "PIPELINE_FAILED" }).eq("id", runId).eq("owner_id", ownerId);
    throw error;
  }
}

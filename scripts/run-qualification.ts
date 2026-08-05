import { runAssessmentPipeline } from "@/services/assessment-pipeline";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { z } from "zod";

const limitArg = process.argv.find((value) => value.startsWith("--limit="));
const parsedLimit = limitArg ? z.coerce.number().int().min(1).max(100).safeParse(limitArg.slice(8)) : { success: true as const, data: undefined };
const mode = process.argv.includes("--backfill") ? "backfill" : "incremental";
const dryRun = process.argv.includes("--dry-run");
async function main() {
  loadProjectEnvironment();
  const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!owner.success || !parsedLimit.success) { console.log("QUALIFICATION: NOT_CONFIGURED_OR_INVALID"); process.exitCode = 1; return; }
  try { const result = await runAssessmentPipeline(owner.data, { mode, limit: parsedLimit.data, dryRun }); console.log(`QUALIFICATION_REUSED: ${result.reused}`); console.log(`QUALIFICATION_RETRIED: ${result.retried}`); console.log(`QUALIFICATION_NEW: ${result.newAssessments}`); console.log(`QUALIFICATION_SUCCEEDED: ${result.succeeded}`); console.log(`QUALIFICATION_FAILED: ${result.failed}`); console.log(`QUALIFICATION_SELECTED: ${result.selected}`); console.log(`QUALIFICATION_FAILURE_CATEGORIES: ${Object.entries(result.failures).map(([key, value]) => `${key}:${value}`).join(",") || "NONE"}`); } catch (error) { console.log(error instanceof Error && error.message === "ASSESSMENT_LOCKED" ? "QUALIFICATION: LOCKED" : "QUALIFICATION: FAILED"); process.exitCode = 1; }
}
void main();

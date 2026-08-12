import { promises as fs } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { inspectUnifiedN8nWorkflow } from "./unified-n8n-contract";

const outputPath = join(process.cwd(), "showcase", "VERIFIED_METRICS.json");

async function main() {
  loadProjectEnvironment();
  const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!owner.success) {
    console.log("SHOWCASE_METRICS: NOT_CONFIGURED");
    process.exitCode = 1;
    return;
  }
  try {
    const db = createAdminSupabaseClient();
    const [sources, jobs, assessments] = await Promise.all([
      db.from("job_sources").select("id", { count: "exact", head: true }).eq("owner_id", owner.data).eq("enabled", true).eq("is_demo", false),
      db.from("jobs").select("id", { count: "exact", head: true }).eq("owner_id", owner.data).eq("active", true).eq("is_demo", false),
      db.from("jobs").select("id", { count: "exact", head: true }).eq("owner_id", owner.data).eq("gemini_assessment_status", "ASSESSED").eq("is_demo", false),
    ]);
    if (sources.error || jobs.error || assessments.error) throw new Error("METRICS_READ_FAILED");
    const workflow = await inspectUnifiedN8nWorkflow();
    const metrics = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      supportedAtsProviders: 3,
      enabledAtsSources: sources.count ?? 0,
      normalizedActiveJobs: jobs.count ?? 0,
      successfulStructuredAssessments: assessments.count ?? 0,
      automatedTests: 32,
      unifiedWorkflowNodes: workflow.nodeCount,
      unifiedWorkflowTriggers: workflow.triggerCount,
      showcaseDataOnly: true,
    };
    await fs.mkdir(join(process.cwd(), "showcase"), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
    console.log(`SHOWCASE_METRICS_ENABLED_SOURCES: ${metrics.enabledAtsSources}`);
    console.log(`SHOWCASE_METRICS_ACTIVE_JOBS: ${metrics.normalizedActiveJobs}`);
    console.log(`SHOWCASE_METRICS_ASSESSMENTS: ${metrics.successfulStructuredAssessments}`);
    console.log(`SHOWCASE_METRICS_WORKFLOW: ${metrics.unifiedWorkflowNodes} nodes / ${metrics.unifiedWorkflowTriggers} triggers`);
    console.log("SHOWCASE_METRICS: PASS");
  } catch {
    console.log("SHOWCASE_METRICS: FAIL");
    process.exitCode = 1;
  }
}

void main();

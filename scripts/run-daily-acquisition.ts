import { z } from "zod";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { runDailyAcquisition } from "@/services/daily-acquisition";

async function main() {
  loadProjectEnvironment(); const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!owner.success) { console.log("MASTER_PIPELINE: NOT_CONFIGURED"); process.exitCode = 1; return; }
  try {
    const result = await runDailyAcquisition(owner.data);
    console.log(`MASTER_PIPELINE_INGESTION_SUCCEEDED: ${result.ingestion.sourcesSucceeded}`);
    console.log(`MASTER_PIPELINE_ASSESSED: ${result.qualification.succeeded}`);
    console.log(`MASTER_PIPELINE_SELECTED: ${result.qualification.selected}`);
    console.log(`MASTER_PIPELINE_CONTACTS: ${result.contacts.eligible}`);
    console.log(`MASTER_PIPELINE_DRAFTS: ${result.drafts.drafts}`);
  } catch { console.log("MASTER_PIPELINE: FAILED"); process.exitCode = 1; }
}
void main();

import { rankApplicationQueue } from "@/services/release-pipeline";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { z } from "zod";

async function main() {
  loadProjectEnvironment();
  const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!owner.success) { console.log("RERANK: NOT_CONFIGURED"); process.exitCode = 1; return; }
  try { console.log(`RERANK_SELECTED: ${await rankApplicationQueue(owner.data)}`); } catch { console.log("RERANK: FAIL"); process.exitCode = 1; }
}

void main();

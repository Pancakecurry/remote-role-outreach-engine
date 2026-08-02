import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { z } from "zod";

async function main() { loadProjectEnvironment(); const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID); if (!owner.success) { console.log("INGESTION_LOCK_RECOVERY: NOT_CONFIGURED"); process.exitCode = 1; return; } try { const result = await createAdminSupabaseClient().from("job_ingestion_locks").delete().eq("owner_id", owner.data); if (result.error) throw result.error; console.log("INGESTION_LOCK_RECOVERY: COMPLETE"); } catch { console.log("INGESTION_LOCK_RECOVERY: FAILED"); process.exitCode = 1; } }
void main();

import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { z } from "zod";
const deadline = setTimeout(() => { console.log("OUTREACH_VERIFY: TIMEOUT"); process.exit(1); }, 15_000);
async function main() { loadProjectEnvironment(); const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID); if (!owner.success) { console.log("OUTREACH_VERIFY: NOT_CONFIGURED"); process.exitCode = 1; return; } const db = createAdminSupabaseClient(); const { data, error } = await db.from("outreach_sequences").select("followup_count,paused,is_test,state").eq("owner_id", owner.data).eq("is_demo", false); if (error) { console.log("OUTREACH_VERIFY: FAIL"); process.exitCode = 1; return; } const safe = (data ?? []).every((row) => row.followup_count <= 2 && (row.paused || !["INITIAL_SENT", "FOLLOWUP_ONE_SENT", "FOLLOWUP_TWO_SENT"].includes(row.state))); console.log(`OUTREACH_SEQUENCE_GATES: ${safe ? "PASS" : "FAIL"}`); console.log("OUTREACH_PRODUCTION_CLAIMS: BLOCKED_IN_DRY_RUN"); if (!safe) process.exitCode = 1; }
void main().finally(() => clearTimeout(deadline));

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { z } from "zod";

const deadline = setTimeout(() => { console.log("SELF_TEST_VERIFY: TIMEOUT"); process.exit(1); }, 15_000);
async function main() {
  loadProjectEnvironment(); const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!owner.success) { console.log("SELF_TEST_VERIFY: NOT_CONFIGURED"); process.exitCode = 1; return; }
  const db = createAdminSupabaseClient(); const { data, error } = await db.from("self_test_sequences").select("is_test,state,gmail_message_id,gmail_thread_id,next_action_at").eq("owner_id", owner.data);
  if (error) { console.log("SELF_TEST_VERIFY: FAIL"); process.exitCode = 1; return; }
  const rows = data ?? []; const isolated = rows.every((row) => row.is_test === true); const cancelled = rows.filter((row) => ["REPLIED", "BOUNCED", "OPTED_OUT", "CLOSED"].includes(row.state)).every((row) => row.next_action_at === null); const identifiers = rows.filter((row) => Boolean(row.gmail_message_id) || Boolean(row.gmail_thread_id)).length;
  console.log(`SELF_TEST_RECORDS: ${rows.length}`); console.log(`SELF_TEST_ISOLATION: ${isolated ? "PASS" : "FAIL"}`); console.log(`SELF_TEST_CANCELLATION: ${cancelled ? "PASS" : "FAIL"}`); console.log(`SELF_TEST_GMAIL_IDENTIFIERS: ${identifiers}`); console.log(`SELF_TEST_VERIFY: ${isolated && cancelled ? "PASS" : "FAIL"}`); if (!isolated || !cancelled) process.exitCode = 1;
}
void main().finally(() => clearTimeout(deadline));

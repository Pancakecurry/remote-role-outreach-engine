import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireDemoGuards } from "./demo-guards";

async function main() { try { const ownerId = requireDemoGuards(); const db = createAdminSupabaseClient(); for (const table of ["contact_evidence", "messages", "outreach_sequences", "email_candidates", "contact_people", "jobs", "job_sources", "companies", "workflow_runs"] as const) { const { error } = await db.from(table).delete().eq("owner_id", ownerId).eq("is_demo", true); if (error) throw error; } console.log("DEMO_REMOVE: COMPLETE"); } catch { console.error("DEMO_REMOVE: REFUSED_OR_FAILED"); process.exitCode = 1; } }
void main();

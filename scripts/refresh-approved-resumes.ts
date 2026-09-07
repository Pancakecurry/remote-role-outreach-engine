import configJson from "../config/resumes.json";
import { createAdminSupabaseClient } from "../src/lib/supabase/admin";
import { resumeConfigSchema, selectBaseResume } from "../src/services/application-package-core";
import { renderTailoredResume } from "../src/services/resume-renderer";

async function main() {
  const owner = process.env.APP_OWNER_USER_ID;
  if (!owner) throw new Error("OWNER_NOT_CONFIGURED");
  const db = createAdminSupabaseClient(), config = resumeConfigSchema.parse(configJson);
  const rows = await db.from("application_packages").select("id,job_id,jobs(title,description_text)").eq("owner_id", owner);
  if (rows.error) throw rows.error;
  let updated = 0;
  for (const row of rows.data ?? []) {
    const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
    if (!job) continue;
    const base = selectBaseResume(config, { title: job.title, description: job.description_text ?? "" });
    const resume = await renderTailoredResume({ baseResume: base, idempotencyKey: row.id, title: "", summary: "" });
    const pkg = await db.from("application_packages").update({ base_resume_id: base.id, tailored_resume_path: resume.path, used_fallback_resume: false }).eq("owner_id", owner).eq("id", row.id);
    if (pkg.error) throw pkg.error;
    const saved = await db.from("jobs").update({ selected_resume_id: base.id, tailored_resume_path: resume.path }).eq("owner_id", owner).eq("id", row.job_id);
    if (saved.error) throw saved.error;
    updated++;
  }
  console.log(JSON.stringify({ approvedResumeAttachmentsUpdated: updated }));
}
void main().catch(() => { console.error("APPROVED_RESUME_REFRESH_FAILED"); process.exitCode = 1; });

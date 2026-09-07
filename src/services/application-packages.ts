import "server-only";
import resumeConfigJson from "../../config/resumes.json";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildApplicationPackage, resumeConfigSchema, type JobForPackage } from "@/services/application-package-core";
import { renderTailoredResume } from "@/services/resume-renderer";

const resumeConfig = resumeConfigSchema.parse(resumeConfigJson);
type JobRow = { id: string; title: string; description_text: string | null; application_url: string; provider: string | null; compensation_band: JobForPackage["compensationBand"]; fit_score: number | null; strongest_matches: string[] | null; relevant_project: string | null; companies: { name: string } | { name: string }[] | null };

export async function generateApplicationPackages(ownerId: string, limit = 15) {
  const db = createAdminSupabaseClient(); const stats = { considered: 0, generated: 0, reused: 0, ownerInputRequired: 0, failed: 0, fallbacks: 0 };
  const response = await db.from("jobs").select("id,title,description_text,application_url,provider,compensation_band,fit_score,strongest_matches,relevant_project,companies(name)").eq("owner_id", ownerId).eq("active", true).eq("selected_for_action", true).eq("is_demo", false).order("final_priority_score", { ascending: false }).limit(Math.min(limit, 30));
  if (response.error) throw new Error("PACKAGE_JOB_READ_FAILED");
  for (const row of (response.data ?? []) as unknown as JobRow[]) {
    stats.considered += 1; const company = Array.isArray(row.companies) ? row.companies[0]?.name : row.companies?.name;
    const job: JobForPackage = { id: row.id, title: row.title, company: company ?? "the company", description: row.description_text ?? "", applicationUrl: row.application_url, provider: row.provider, compensationBand: row.compensation_band ?? "unknown", fitScore: row.fit_score ?? 0, strongestMatches: row.strongest_matches ?? [], relevantProject: row.relevant_project };
    const pkg = buildApplicationPackage(resumeConfig, job); const existing = await db.from("application_packages").select("id,idempotency_key").eq("owner_id", ownerId).eq("job_id", row.id).maybeSingle();
    if (existing.data?.idempotency_key === pkg.idempotencyKey) {
      const restored = await db.from("jobs").update({ pipeline_status: pkg.ownerInput.length ? "owner_input_required" : "manual_apply", next_action: pkg.nextAction }).eq("owner_id", ownerId).eq("id", row.id).in("pipeline_status", ["qualified", "manual_apply", "package_ready", "owner_input_required"]);
      if (restored.error) throw new Error("PACKAGE_QUEUE_UPDATE_FAILED");
      stats.reused += 1; continue;
    }
    try {
      const rendered = await renderTailoredResume(pkg); if (rendered.fallback) stats.fallbacks += 1;
      const status = pkg.ownerInput.length ? "owner_input_required" : "manual_apply"; if (pkg.ownerInput.length) stats.ownerInputRequired += 1;
      const write = await db.from("application_packages").upsert({ owner_id: ownerId, job_id: row.id, idempotency_key: pkg.idempotencyKey, base_resume_id: pkg.baseResume.id, tailored_resume_path: rendered.path, used_fallback_resume: rendered.fallback, cover_letter: pkg.coverLetter, why_fit: pkg.whyFit, salary_recommendation: pkg.salaryRecommendation, screening_answers: pkg.screeningAnswers, owner_input: pkg.ownerInput, application_notes: pkg.nextAction, capability: pkg.capability, status }, { onConflict: "owner_id,job_id" }).select("id").single();
      if (write.error || !write.data) throw new Error("PACKAGE_WRITE_FAILED");
      await db.from("jobs").update({ selected_resume_id: pkg.baseResume.id, tailored_resume_path: rendered.path, application_capability: pkg.capability, pipeline_status: status, next_action: pkg.nextAction, failure_reason: null }).eq("owner_id", ownerId).eq("id", row.id);
      await db.from("application_audit_events").insert({ owner_id: ownerId, job_id: row.id, package_id: write.data.id, event_type: "PACKAGE_GENERATED", details: { baseResumeId: pkg.baseResume.id, fallback: rendered.fallback, idempotencyKey: pkg.idempotencyKey } });
      stats.generated += 1;
    } catch (error) { const reason = error instanceof Error ? error.message : "PACKAGE_FAILED"; await db.from("jobs").update({ pipeline_status: "owner_input_required", next_action: "Resolve package generation failure", failure_reason: reason }).eq("owner_id", ownerId).eq("id", row.id); await db.from("application_audit_events").insert({ owner_id: ownerId, job_id: row.id, event_type: "PACKAGE_FAILED", details: { reason } }); stats.failed += 1; }
  }
  return stats;
}

import { pipelineThresholds } from "@/config/pipeline-thresholds";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { z } from "zod";

type Row = { active: boolean; deterministic_status: string; gemini_assessment_status: string; fit_score: number | null; fit_confidence: number | null; remote_eligibility: string | null; seniority_classification: string | null; title: string; selected_for_action: boolean };
const group = (rows: Row[], value: (row: Row) => string) => Object.entries(rows.reduce<Record<string, number>>((counts, row) => { const key = value(row) || "UNCLASSIFIED"; counts[key] = (counts[key] ?? 0) + 1; return counts; }, {})).sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => `${key}:${count}`).join(",") || "NONE";
const bucket = (rows: Row[], field: "fit_score" | "fit_confidence", ranges: Array<[string, number, number]>) => ranges.map(([name, low, high]) => `${name}:${rows.filter((row) => row[field] !== null && Number(row[field]) >= low && Number(row[field]) <= high).length}`).join(",");
const roleFamily = (title: string) => /rag|llm|generative/i.test(title) ? "LLM_RAG" : /fastapi|backend/i.test(title) ? "PYTHON_BACKEND" : /full.stack|product/i.test(title) ? "FULL_STACK_PRODUCT" : /automation/i.test(title) ? "AI_AUTOMATION" : /ai|machine learning/i.test(title) ? "AI_ENGINEERING" : "OTHER";

async function main() {
  loadProjectEnvironment();
  const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!owner.success) { console.log("QUAL_DIAG: NOT_CONFIGURED"); process.exitCode = 1; return; }
  const db = createAdminSupabaseClient();
  const { data, error } = await db.from("jobs").select("active,deterministic_status,gemini_assessment_status,fit_score,fit_confidence,remote_eligibility,seniority_classification,title,selected_for_action").eq("owner_id", owner.data).eq("is_demo", false);
  if (error) { console.log("QUAL_DIAG: FAIL"); process.exitCode = 1; return; }
  const rows = (data ?? []) as Row[];
  const count = (predicate: (row: Row) => boolean) => rows.filter(predicate).length;
  const assessed = rows.filter((row) => row.gemini_assessment_status === "ASSESSED");
  const application = (row: Row) => row.active && row.deterministic_status !== "REJECTED" && row.gemini_assessment_status === "ASSESSED" && row.remote_eligibility !== "INELIGIBLE" && (row.fit_score ?? 0) >= pipelineThresholds.application.fitScore && (row.fit_confidence ?? 0) >= pipelineThresholds.application.confidence;
  const contact = (row: Row) => application(row) && row.deterministic_status === "ELIGIBLE" && (row.fit_score ?? 0) >= pipelineThresholds.contact.fitScore && (row.fit_confidence ?? 0) >= pipelineThresholds.contact.confidence;
  const autosend = (row: Row) => contact(row) && (row.fit_score ?? 0) >= pipelineThresholds.autosend.fitScore && (row.fit_confidence ?? 0) >= pipelineThresholds.autosend.confidence;
  console.log(`QUAL_ACTIVE: ${count((row) => row.active)}`);
  console.log(`QUAL_HARD_REJECTS: ${count((row) => row.deterministic_status === "REJECTED")}`);
  console.log(`QUAL_REVIEW: ${count((row) => row.deterministic_status === "REVIEW")}`);
  console.log(`QUAL_PLAUSIBLE: ${count((row) => row.deterministic_status === "ELIGIBLE")}`);
  console.log(`QUAL_GEMINI_ATTEMPTS: ${count((row) => ["ASSESSED", "FAILED"].includes(row.gemini_assessment_status))}`);
  console.log(`QUAL_GEMINI_SUCCESS: ${count((row) => row.gemini_assessment_status === "ASSESSED")}`);
  console.log("QUAL_GEMINI_SCHEMA_FAILURES: NOT_PERSISTED");
  console.log(`QUAL_GEMINI_PROVIDER_FAILURES: ${count((row) => row.gemini_assessment_status === "FAILED")} (failure subtype not persisted)`);
  console.log("QUAL_GEMINI_ELIGIBLE: NOT_PERSISTED");
  console.log("QUAL_SHOULD_CONTACT: NOT_PERSISTED");
  console.log(`QUAL_REMOTE_CATEGORIES: ${group(rows, (row) => row.remote_eligibility ?? "PENDING")}`);
  console.log(`QUAL_SENIORITY_CATEGORIES: ${group(assessed, (row) => row.seniority_classification ?? "UNCLASSIFIED")}`);
  console.log(`QUAL_ROLE_FAMILIES: ${group(assessed, (row) => roleFamily(row.title))}`);
  console.log(`QUAL_FIT_BUCKETS: ${bucket(rows, "fit_score", [["0-49", 0, 49], ["50-59", 50, 59], ["60-67", 60, 67], ["68-72", 68, 72], ["73-77", 73, 77], ["78-84", 78, 84], ["85-100", 85, 100]])}`);
  console.log(`QUAL_CONFIDENCE_BUCKETS: ${bucket(rows, "fit_confidence", [["below-0.50", 0, 0.49], ["0.50-0.59", 0.5, 0.59], ["0.60-0.69", 0.6, 0.69], ["0.70-0.79", 0.7, 0.79], ["0.80-0.84", 0.8, 0.84], ["0.85+", 0.85, 1]])}`);
  console.log(`QUAL_ELIMINATED_HARD_REJECT: ${count((row) => row.deterministic_status === "REJECTED")}`);
  console.log(`QUAL_ELIMINATED_NO_ASSESSMENT: ${count((row) => row.active && row.deterministic_status !== "REJECTED" && row.gemini_assessment_status !== "ASSESSED")}`);
  console.log(`QUAL_ELIMINATED_APPLICATION_SCORE_OR_CONFIDENCE: ${count((row) => row.active && row.deterministic_status !== "REJECTED" && row.gemini_assessment_status === "ASSESSED" && !application(row))}`);
  console.log(`QUAL_APPLICATION_THRESHOLD: ${count(application)}`);
  console.log(`QUAL_CONTACT_THRESHOLD_WITHOUT_UNPERSISTED_GEMINI_GATES: ${count(contact)}`);
  console.log(`QUAL_AUTOSEND_THRESHOLD_WITHOUT_CONTACT_EVIDENCE: ${count(autosend)}`);
  console.log(`QUAL_SELECTED: ${count((row) => row.selected_for_action)}`);
}

void main();

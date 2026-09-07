import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import resumeConfigJson from "../config/resumes.json";
import { buildApplicationPackage, resumeConfigSchema, selectBaseResume, answerScreeningQuestions } from "@/services/application-package-core";
import { compensationBandFromMonthlyPhp, rankJob } from "@/services/job-ranking";
import { renderTailoredResume } from "@/services/resume-renderer";
import { deterministicEligibility } from "@/services/job-eligibility";
import { leverAdapter } from "@/integrations/job-sources/lever/paginated";
import { ashbyAdapter } from "@/integrations/job-sources/ashby";
import { gmailEventTransition } from "@/lib/outreach/gmail-events";
import { dailySummaryEventKey } from "@/lib/daily-summary-key";
import { canReconcileMissingJobs } from "@/lib/job-lifecycle";

const config = resumeConfigSchema.parse(resumeConfigJson);
const job = { id: "job-1", title: "AI Implementation Engineer", company: "Example Co", description: "Build Python FastAPI RAG integrations and troubleshoot customer workflows", applicationUrl: "https://example.com/apply", provider: "GREENHOUSE", compensationBand: "unknown" as const, fitScore: 88, strongestMatches: ["Python", "FastAPI", "RAG"], relevantProject: "Decimal OS" };

describe("salary-safe ranking", () => {
  it("retains low and unknown compensation as ranked inputs", () => { expect(compensationBandFromMonthlyPhp(50_000)).toBe("below_target"); expect(compensationBandFromMonthlyPhp(null)).toBe("unknown"); const low = rankJob({ technicalFit: 90, roleFamilyFit: 90, locationFlexibility: 100, compensationBand: "below_target", recency: 100, experienceFit: 80, companyQuality: 70, competition: null, applicationFriction: 80, employmentPotential: 80, missionUsefulness: 90 }); expect(low.score).toBeGreaterThan(60); });
  it("rejects only real hard blockers", () => { expect(deterministicEligibility({ title: "Technical Support Engineer", description_text: "Lower salary contract with growth potential", location_text: "Remote worldwide", workplace_type: "REMOTE" }).status).not.toBe("REJECTED"); expect(deterministicEligibility({ title: "AI Engineer", description_text: "Must be a US citizen and hold security clearance", location_text: "US only", workplace_type: "REMOTE" }).status).toBe("REJECTED"); });
});

describe("three-resume packages", () => {
  it("selects the support resume for support-heavy roles", () => { expect(selectBaseResume(config, { title: "Technical Support Engineer", description: "Customer troubleshooting and incident support" }).id).toBe("technical-support-engineer"); });
  it("builds a truthful KISS package and content-sensitive idempotency key", () => { const first = buildApplicationPackage(config, job); const second = buildApplicationPackage(config, job); expect(first.idempotencyKey).toBe(second.idempotencyKey); expect(buildApplicationPackage(config, { ...job, description: `${job.description} Updated.` }).idempotencyKey).not.toBe(first.idempotencyKey); expect(first.coverLetter).toContain("understand → build or fix → test → make it reliable"); expect(first.capability).toBe("manual_only"); });
  it("marks unsupported screening questions for the owner", () => { const answers = answerScreeningQuestions([{ id: "known", question: "Describe your RAG experience", required: true }, { id: "unknown", question: "What is your current notice-period obligation?", required: true }]); expect(answers[0].status).toBe("ANSWERED"); expect(answers[1].status).toBe("OWNER_INPUT_REQUIRED"); });
  it("uses the approved one-page PDF byte-for-byte regardless of job-specific text", async () => { const output = await mkdtemp(join(tmpdir(), "resume-os-")); process.env.RESUME_OUTPUT_DIR = output; const pkg = buildApplicationPackage(config, job); const rendered = await renderTailoredResume(pkg); const bytes = await readFile(rendered.path); expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1); expect(bytes.equals(await readFile(pkg.baseResume.sourcePath))).toBe(true); const repeat = await renderTailoredResume({ ...pkg, idempotencyKey: "different-job", summary: "Ignored. ".repeat(3000) }); expect(repeat.path).toBe(rendered.path); expect(repeat.selectedOriginal).toBe(true); });
});

describe("ATS pagination", () => {
  it("retains valid Ashby listings with null optional fields", () => {
    const normalized = ashbyAdapter.normalizeJob({id:"job-null",title:"AI Engineer",workplaceType:null,department:null,team:null,location:null,descriptionHtml:null,jobUrl:"https://jobs.ashbyhq.com/example/job-null"}, {id:"00000000-0000-4000-8000-000000000001",provider:"ASHBY",companyName:"Example",companyDomain:"example.com",boardIdentifier:"example",enabled:true,isDemo:false});
    expect(normalized.externalJobId).toBe("job-null");
    expect(normalized.workplaceType).toBe("UNKNOWN");
  });
  it("does not close jobs from malformed snapshots or immediate repeat runs", () => {
    const now = Date.parse("2026-09-04T12:00:00Z");
    expect(canReconcileMissingJobs(true, 1, null, now)).toBe(false);
    expect(canReconcileMissingJobs(false, 0, null, now)).toBe(false);
    expect(canReconcileMissingJobs(true, 0, "2026-09-04T11:59:00Z", now)).toBe(false);
    expect(canReconcileMissingJobs(true, 0, "2026-09-04T08:00:00Z", now)).toBe(true);
  });
  it("paginates Lever until the final partial page", async () => { const requests: string[] = []; const make = (index: number) => ({ id: `id-${index}`, text: `AI Engineer ${index}`, hostedUrl: `https://jobs.lever.co/example/id-${index}`, categories: { location: "Remote" } }); const fetchImpl = (async (input: RequestInfo | URL) => { const url = String(input); requests.push(url); const skip = Number(new URL(url).searchParams.get("skip") ?? 0); const jobs = skip === 0 ? Array.from({ length: 100 }, (_, index) => make(index)) : [make(100)]; return new Response(JSON.stringify(jobs), { status: 200, headers: { "content-type": "application/json" } }); }) as typeof fetch; const result = await leverAdapter.fetchJobs({ id: "00000000-0000-4000-8000-000000000001", provider: "LEVER", companyName: "Example", companyDomain: "example.com", boardIdentifier: "example", providerRegion: "GLOBAL", enabled: true, isDemo: false }, { fetchImpl, maxJobs: 250 }); expect(result.requestStatus).toBe("SUCCESS"); expect(result.jobs).toHaveLength(101); expect(result.completeSnapshot).toBe(true); expect(requests).toHaveLength(2); });
});

describe("reply and summary safety", () => {
  it("cancels follow-ups on replies, bounces, and opt-outs", () => { expect(gmailEventTransition("INBOUND_REPLY")).toEqual({ terminal: true, state: "REPLIED", suppress: false }); expect(gmailEventTransition("BOUNCE")).toEqual({ terminal: true, state: "BOUNCED", suppress: true }); expect(gmailEventTransition("OPT_OUT")).toEqual({ terminal: true, state: "OPTED_OUT", suppress: true }); expect(gmailEventTransition("AUTOMATIC_RESPONSE").terminal).toBe(false); });
  it("deduplicates each daily summary deterministically", () => { expect(dailySummaryEventKey("2026-09-03")).toBe(dailySummaryEventKey("2026-09-03")); expect(dailySummaryEventKey("2026-09-04")).not.toBe(dailySummaryEventKey("2026-09-03")); });
});

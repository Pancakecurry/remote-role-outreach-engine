import { createHash } from "node:crypto";
import { z } from "zod";

export const resumeConfigSchema = z.object({
  version: z.string().min(1),
  resumes: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), sourcePath: z.string().min(1), baseTitle: z.string().min(1), keywords: z.array(z.string().min(1)).min(1) })).min(1).max(3),
});
export type ResumeConfig = z.infer<typeof resumeConfigSchema>;
export type JobForPackage = { id: string; title: string; company: string; description: string; applicationUrl: string; provider: string | null; compensationBand: "below_target" | "acceptable" | "strong" | "exceptional" | "unknown"; fitScore: number; strongestMatches: string[]; relevantProject: string | null };
export type ScreeningQuestion = { id: string; question: string; required: boolean };

const approvedFacts = {
  decimal: "I built and currently support Decimal OS, a 70+ screen Flutter/FastAPI/Supabase product with grounded RAG and 50+ active users.",
  outreach: "I built the Remote Role Outreach Engine with Next.js, TypeScript, Supabase, n8n, Gmail API safety controls, and Greenhouse/Lever/Ashby ingestion.",
  support: "I reproduce issues, trace frontend/backend/API/database failures, document fixes, and communicate clearly with technical and non-technical users.",
  automation: "I build maintainable automations with n8n, APIs, webhooks, Gmail, CRM workflows, and structured AI outputs.",
  education: "My B.Tech in Artificial Intelligence and Machine Learning spans 2022–2026.",
} as const;

export function selectBaseResume(config: ResumeConfig, job: Pick<JobForPackage, "title" | "description">) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  return config.resumes.map((resume, index) => ({ resume, index, score: resume.keywords.reduce((sum, keyword) => sum + (text.includes(keyword.toLowerCase()) ? 1 : 0), 0) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]!.resume;
}

export function applicationCapability(provider: string | null) {
  if (["GREENHOUSE", "LEVER", "ASHBY"].includes(provider ?? "")) return "manual_only" as const;
  return "manual_only" as const;
}

export function answerScreeningQuestions(questions: ScreeningQuestion[]) {
  return questions.map((item) => {
    const text = item.question.toLowerCase();
    if (/rag|retrieval|document intelligence/.test(text)) return { ...item, answer: approvedFacts.decimal, status: "ANSWERED" as const, evidence: "Decimal OS" };
    if (/automation|n8n|webhook|integration/.test(text)) return { ...item, answer: approvedFacts.automation, status: "ANSWERED" as const, evidence: "Remote Role Outreach Engine" };
    if (/support|troubleshoot|debug|customer/.test(text)) return { ...item, answer: approvedFacts.support, status: "ANSWERED" as const, evidence: "Decimal OS and production debugging" };
    if (/degree|education|graduate/.test(text)) return { ...item, answer: approvedFacts.education, status: "ANSWERED" as const, evidence: "Education" };
    return { ...item, answer: null, status: "OWNER_INPUT_REQUIRED" as const, evidence: null };
  });
}

const projectFor = (job: JobForPackage) => /support|customer|implementation|solutions|operations/i.test(job.title) ? approvedFacts.support : /automation|integration|n8n/i.test(`${job.title} ${job.description}`) ? approvedFacts.outreach : approvedFacts.decimal;
export function buildApplicationPackage(config: ResumeConfig, job: JobForPackage, questions: ScreeningQuestion[] = []) {
  const base = selectBaseResume(config, job);
  const proof = projectFor(job);
  const title = job.title.length <= 70 ? job.title : base.baseTitle;
  const summary = `${base.label} with hands-on experience building, shipping, and supporting production AI and automation systems. Strongest match for this role: ${(job.strongestMatches.slice(0, 3).join(", ") || "full-stack ownership, practical debugging, and clear communication")}.`;
  const coverLetter = `Hey! 👋\n\nIt looks like ${job.company} needs someone who can make ${job.title} work reliably in practice.\n\n${proof}\n\nMy approach is simple: understand → build or fix → test → make it reliable.\n\nQuick question: what is the most important outcome you want this person to own in the first 60 days?\n\nCheers,\nArnav`;
  const whyFit = `${job.strongestMatches.slice(0, 3).join("; ") || "Relevant production engineering and support experience"}. Best proof: ${job.relevantProject || "Decimal OS"}.`;
  const salaryRecommendation = job.compensationBand === "below_target" ? "Apply if strategically useful; clarify growth, hours, and review timing." : job.compensationBand === "unknown" ? "Ask for the approved budget or range before committing." : "Use the published range and target its upper half when the scope matches.";
  const screeningAnswers = answerScreeningQuestions(questions);
  const ownerInput = screeningAnswers.filter((answer) => answer.status === "OWNER_INPUT_REQUIRED");
  const idempotencyKey = createHash("sha256").update(`${job.id}:${config.version}:${base.id}:${job.title}:${job.company}:${job.description}`).digest("hex");
  return { idempotencyKey, baseResume: base, title, summary, coverLetter, whyFit, salaryRecommendation, screeningAnswers, ownerInput, capability: applicationCapability(job.provider), nextAction: ownerInput.length ? "Answer required screening questions" : "Review package and open official application" };
}

export type EligibilityJob = { title: string; description_text: string | null; location_text: string; workplace_type: string | null };
export function earlyCareerFit(job: Pick<EligibilityJob, "title" | "description_text">) {
  const text = (job.description_text ?? "").toLowerCase();
  const years = [...text.matchAll(/\b(\d{1,2})(?:\s*[-–]\s*\d{1,2})?\+?\s+years?\s+(?:of\s+)?(?:relevant\s+|professional\s+|hands-on\s+|software\s+engineering\s+|engineering\s+)?experience/g)].map(m => Number(m[1]));
  const minimum = years.length ? Math.max(...years) : null;
  if (/\b(senior|sr\.?|staff|principal|lead|director|head|founder|founding|architect)\b|engineer\s+(?:iii|iv|[3-9])\b/i.test(job.title) || (minimum !== null && minimum >= 3)) return { score: 10, adjustment: -35, reason: `Experience stretch: ${minimum !== null ? `${minimum}+ years listed` : "senior/lead/founding title"}; not an entry-level priority` };
  if (/\b(junior|jr\.?|associate|graduate|trainee|intern|entry.level)\b|engineer\s+(?:i|1)\b/i.test(job.title) || (minimum !== null && minimum <= 2) || /no (?:prior )?experience required|freshers? (?:can apply|welcome)/i.test(text)) return { score: 100, adjustment: 15, reason: "Early-career priority: junior/graduate title or explicit 0–2-year entry path" };
  return { score: 45, adjustment: 0, reason: "Experience requirements unclear: review before treating as entry-level" };
}
export function deterministicEligibility(job: EligibilityJob) {
  const text = `${job.title} ${job.location_text} ${job.description_text ?? ""}`.toLowerCase(); const hardReasons: string[] = []; const reviewReasons: string[] = [];
  if (/security clearance|must be (a )?us citizen|u\.s\. citizens only|canada only|eu only|unpaid|commission.only/.test(text)) hardReasons.push("HARD_BLOCKER");
  if ((job.workplace_type === "ONSITE" || job.workplace_type === "HYBRID") && !/india|remote|global|worldwide|anywhere|apac|asia/.test(text)) hardReasons.push("GEOGRAPHY_INELIGIBLE");
  if (/staff(?: [\w+-]+){0,3} engineer|principal(?: [\w+-]+){0,3} engineer|director|head of |phd required|doctorate required/.test(text)) reviewReasons.push("EXPERIENCE_REVIEW");
  const roleMatch = /(ai|machine learning|llm|rag|python|fastapi|full.stack|backend|automation|implementation|solutions|support|operations)/.test(text); if (!roleMatch) reviewReasons.push("ADJACENT_ROLE");
  const remote = /remote|worldwide|global|anywhere|india|apac|asia/.test(text); if (!remote && !hardReasons.length) reviewReasons.push("LOCATION_REVIEW");
  const overlap = ["python", "fastapi", "ai", "llm", "rag", "full-stack", "automation", "implementation", "support", "operations"].filter((word) => text.includes(word)).length;
  const score = Math.min(100, Math.max(10, 25 + overlap * 7 + (remote ? 18 : 0) + (roleMatch ? 12 : 0) - reviewReasons.length * 5 + earlyCareerFit(job).adjustment));
  const reasons = [...hardReasons, ...reviewReasons]; return { status: hardReasons.length ? "REJECTED" : reviewReasons.length ? "REVIEW" : "ELIGIBLE", score, reasons, remoteEligibility: hardReasons.includes("GEOGRAPHY_INELIGIBLE") ? "INELIGIBLE" : remote ? "ELIGIBLE" : "MANUAL_REVIEW" } as const;
}

import { z } from "zod";
import { buildCanonical, htmlToSafeText, normalizeWorkplace, nullableDate, nullableText, safeUrl } from "../normalization";
import { providerOrigins, safeProviderJson, sanitizeProviderError, sha256 } from "../safe-http";
import type { CanonicalIngestedJob, JobSourceAdapter } from "../types";

const identifier = /^[a-z0-9][a-z0-9_-]{0,99}$/;
const jobSchema = z.object({ id: z.string().min(1), text: z.string().min(1), hostedUrl: z.string().url(), applyUrl: z.string().url().optional(), descriptionPlain: z.string().optional(), description: z.string().optional(), categories: z.object({ location: z.string().optional(), commitment: z.string().optional(), department: z.string().optional(), team: z.string().optional() }).optional(), country: z.string().optional(), workplaceType: z.string().optional(), createdAt: z.number().optional(), updatedAt: z.number().optional() }).passthrough();
const responseSchema = z.array(z.unknown());

export const leverAdapter: JobSourceAdapter = {
  provider: "LEVER",
  validateSource(source) { const region = source.providerRegion ?? "GLOBAL"; const valid = source.provider === "LEVER" && identifier.test(source.boardIdentifier) && (region === "GLOBAL" || region === "EU"); return { success: valid, errorCategory: valid ? null : "INVALID_SOURCE_IDENTIFIER" }; },
  normalizeJob(raw, source) { const job = jobSchema.parse(raw); const postingUrl = safeUrl(job.hostedUrl, "https://api.lever.co"); return buildCanonical(source, { externalJobId: job.id, provider: "LEVER", title: job.text, descriptionText: job.descriptionPlain?.trim() || htmlToSafeText(job.description), descriptionHtml: null, locationText: job.categories?.location ?? "Unspecified", workplaceType: normalizeWorkplace(job.workplaceType ?? job.categories?.location), employmentType: nullableText(job.categories?.commitment), department: nullableText(job.categories?.department), team: nullableText(job.categories?.team), seniorityText: null, countryCode: nullableText(job.country)?.toUpperCase() ?? null, postingUrl, applicationUrl: safeUrl(job.applyUrl, postingUrl), providerUpdatedAt: nullableDate(job.updatedAt ? new Date(job.updatedAt).toISOString() : null), publishedAt: nullableDate(job.createdAt ? new Date(job.createdAt).toISOString() : null) }); },
  async fetchJobs(source, context = {}) {
    const started = Date.now(); const validation = this.validateSource(source); const failed = (category: string | null) => ({ provider: "LEVER" as const, sourceId: source.id, fetchedAt: new Date().toISOString(), requestStatus: "FAILED" as const, jobs: [], totalReceived: 0, malformedCount: 0, payloadHash: null, retryCount: 0, durationMs: Date.now() - started, sanitizedErrorCategory: category, retryAfter: null, completeSnapshot: false });
    if (!validation.success) return failed(validation.errorCategory);
    try {
      const origin = (source.providerRegion ?? "GLOBAL") === "EU" ? providerOrigins.LEVER_EU : providerOrigins.LEVER_GLOBAL; const maximum = context.maxJobs ?? 500; const pageSize = Math.min(100, maximum); const rawJobs: unknown[] = []; let skip = 0; let retryCount = 0; let retryAfter: number | null = null; let completeSnapshot = false;
      while (rawJobs.length < maximum) { const response = await safeProviderJson(`${origin}/v0/postings/${encodeURIComponent(source.boardIdentifier)}?mode=json&limit=${pageSize}&skip=${skip}`, context.fetchImpl); const page = responseSchema.parse(response.payload); retryCount += response.retryCount; retryAfter = response.retryAfter; rawJobs.push(...page.slice(0, maximum - rawJobs.length)); if (page.length < pageSize) { completeSnapshot = true; break; } skip += page.length; }
      const jobs: CanonicalIngestedJob[] = []; let malformedCount = 0; for (const raw of rawJobs) { try { jobs.push(this.normalizeJob(raw, source)); } catch { malformedCount += 1; } }
      return { provider: "LEVER" as const, sourceId: source.id, fetchedAt: new Date().toISOString(), requestStatus: "SUCCESS" as const, jobs, totalReceived: rawJobs.length, malformedCount, payloadHash: sha256(JSON.stringify(rawJobs.map((job) => String((job as { id?: unknown }).id ?? "")))), retryCount, durationMs: Date.now() - started, sanitizedErrorCategory: null, retryAfter, completeSnapshot };
    } catch (error) { return failed(sanitizeProviderError(error)); }
  },
};

import { z } from "zod";

export const jobSourceProviderSchema = z.enum(["GREENHOUSE", "LEVER", "ASHBY"]);
export type JobSourceProvider = z.infer<typeof jobSourceProviderSchema>;

export const jobSourceConfigSchema = z.object({
  id: z.string().uuid(),
  provider: jobSourceProviderSchema,
  companyName: z.string().min(1).max(160),
  companyDomain: z.string().min(1).max(253),
  boardIdentifier: z.string().min(1).max(120),
  providerRegion: z.enum(["GLOBAL", "EU"]).nullable().optional(),
  enabled: z.boolean(),
  isDemo: z.literal(false),
});
export type JobSourceConfig = z.infer<typeof jobSourceConfigSchema>;

export type CanonicalIngestedJob = {
  sourceId: string; companyName: string; companyDomain: string; externalJobId: string; provider: JobSourceProvider;
  title: string; normalizedTitle: string; descriptionText: string; descriptionHtml: string | null; locationText: string;
  workplaceType: "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN"; employmentType: string | null; department: string | null;
  team: string | null; seniorityText: string | null; countryCode: string | null; postingUrl: string; applicationUrl: string;
  providerUpdatedAt: string | null; publishedAt: string | null; payloadHash: string; dedupHash: string; active: true;
  qualificationStatus: "PENDING"; isDemo: false;
};

export type ProviderFetchResult = {
  provider: JobSourceProvider; sourceId: string; fetchedAt: string; requestStatus: "SUCCESS" | "FAILED"; jobs: CanonicalIngestedJob[];
  totalReceived: number; malformedCount: number; payloadHash: string | null; retryCount: number; durationMs: number;
  sanitizedErrorCategory: string | null; retryAfter: number | null;
};

export type FetchContext = { fetchImpl?: typeof fetch; maxJobs?: number };

export interface JobSourceAdapter {
  provider: JobSourceProvider;
  validateSource(source: JobSourceConfig): { success: boolean; errorCategory: string | null };
  fetchJobs(source: JobSourceConfig, context?: FetchContext): Promise<ProviderFetchResult>;
  normalizeJob(rawJob: unknown, source: JobSourceConfig): CanonicalIngestedJob;
}

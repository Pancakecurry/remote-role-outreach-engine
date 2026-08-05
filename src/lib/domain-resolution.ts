import { isIP } from "node:net";

const atsHosts = new Set(["greenhouse.io", "boards.greenhouse.io", "lever.co", "jobs.lever.co", "ashbyhq.com", "jobs.ashbyhq.com"]);
export type DomainResolution = { domain: string | null; source: "EXISTING_VERIFIED" | "SOURCE_COMPANY_DOMAIN" | "POSTING_URL" | "APPLICATION_URL" | "MANUAL" | "UNRESOLVED"; confidence: "VERIFIED" | "HIGH" | "MEDIUM" | "LOW" | "REJECTED"; reason: string | null };
export const registrableDomain = (value: string) => { const hostname = value.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/, 1)[0].replace(/^www\./, ""); if (!hostname || isIP(hostname) || hostname === "localhost" || hostname.endsWith(".local")) return null; const parts = hostname.split(".").filter(Boolean); return parts.length >= 2 ? parts.slice(-2).join(".") : null; };
export const isAtsDomain = (domain: string) => [...atsHosts].some((host) => domain === host || domain.endsWith(`.${host}`));
export function resolveCompanyDomain(input: { verifiedDomain?: string | null; sourceCompanyDomain?: string | null; postingUrl?: string | null; applicationUrl?: string | null; manualDomain?: string | null }): DomainResolution {
  const candidates: Array<[string | null | undefined, DomainResolution["source"], DomainResolution["confidence"]]> = [[input.verifiedDomain, "EXISTING_VERIFIED", "VERIFIED"], [input.sourceCompanyDomain, "SOURCE_COMPANY_DOMAIN", "HIGH"], [input.postingUrl, "POSTING_URL", "MEDIUM"], [input.applicationUrl, "APPLICATION_URL", "LOW"], [input.manualDomain, "MANUAL", "VERIFIED"]];
  for (const [value, source, confidence] of candidates) { if (!value) continue; const domain = registrableDomain(value); if (!domain) continue; if (isAtsDomain(domain)) continue; return { domain, source, confidence, reason: null }; }
  return { domain: null, source: "UNRESOLVED", confidence: "REJECTED", reason: "NO_TRUSTWORTHY_COMPANY_DOMAIN" };
}

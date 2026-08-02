import * as cheerio from "cheerio";
import { sha256 } from "./safe-http";
import type { CanonicalIngestedJob, JobSourceConfig } from "./types";

const maxDescriptionLength = 20_000;
export function htmlToSafeText(value: string | null | undefined) {
  const $ = cheerio.load(value ?? "");
  $("script,style,form,iframe,object,embed,noscript").remove();
  $("br").replaceWith("\n"); $("li").each((_, node) => { $(node).prepend("• "); }); $("h1,h2,h3,h4,h5,h6,p,div").each((_, node) => { $(node).append("\n"); });
  return $.text().replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim().slice(0, maxDescriptionLength);
}
export const cleanTitle = (title: string) => title.trim().replace(/\s+/g, " ");
export const normalizedTitle = (title: string) => cleanTitle(title).toLowerCase();
export const normalizeWorkplace = (value: unknown): CanonicalIngestedJob["workplaceType"] => {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("remote")) return "REMOTE"; if (text.includes("hybrid")) return "HYBRID"; if (text.includes("on-site") || text.includes("onsite") || text.includes("in office")) return "ONSITE"; return "UNKNOWN";
};
export const safeUrl = (value: unknown, fallback: string) => { try { const url = new URL(String(value ?? fallback)); return url.protocol === "https:" ? url.toString() : fallback; } catch { return fallback; } };
export const nullableText = (value: unknown) => typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null;
export const nullableDate = (value: unknown) => { const date = new Date(String(value ?? "")); return Number.isNaN(date.getTime()) ? null : date.toISOString(); };
export function buildCanonical(source: JobSourceConfig, value: Omit<CanonicalIngestedJob, "sourceId" | "companyName" | "companyDomain" | "normalizedTitle" | "payloadHash" | "dedupHash" | "active" | "qualificationStatus" | "isDemo">): CanonicalIngestedJob {
  const title = cleanTitle(value.title); const stable = `${source.id}|${value.externalJobId}|${value.postingUrl}`; const payloadHash = sha256(JSON.stringify(value));
  return { ...value, sourceId: source.id, companyName: source.companyName, companyDomain: source.companyDomain.toLowerCase(), title, normalizedTitle: normalizedTitle(title), payloadHash, dedupHash: sha256(stable), active: true, qualificationStatus: "PENDING", isDemo: false };
}

import { createHash } from "node:crypto";

export const providerOrigins = {
  GREENHOUSE: "https://boards-api.greenhouse.io",
  LEVER_GLOBAL: "https://api.lever.co",
  LEVER_EU: "https://api.eu.lever.co",
  ASHBY: "https://api.ashbyhq.com",
} as const;

const MAX_BYTES = 2_500_000;
const TIMEOUT_MS = 20_000;
const retryable = new Set([429, 502, 503, 504]);

export function isAllowedProviderUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.port === "" && url.username === "" && url.password === "" && Object.values(providerOrigins).includes(url.origin as never);
  } catch { return false; }
}

export async function safeProviderJson(url: string, fetchImpl: typeof fetch = fetch) {
  if (!isAllowedProviderUrl(url)) throw new Error("ATS_ORIGIN_REJECTED");
  let retryCount = 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, { method: "GET", redirect: "error", signal: controller.signal, headers: { Accept: "application/json", "User-Agent": "RemoteRoleOutreachEngine/0.1 public-ats-read-only" } });
      const retryAfter = Number(response.headers.get("retry-after")) || null;
      if (!response.ok) {
        if (attempt === 0 && retryable.has(response.status)) { retryCount += 1; await new Promise((resolve) => setTimeout(resolve, Math.min((retryAfter ?? 1) * 1000, 5_000))); continue; }
        throw new Error(`ATS_HTTP_${response.status}`);
      }
      const length = Number(response.headers.get("content-length"));
      if (Number.isFinite(length) && length > MAX_BYTES) throw new Error("ATS_RESPONSE_TOO_LARGE");
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > MAX_BYTES) throw new Error("ATS_RESPONSE_TOO_LARGE");
      return { payload: JSON.parse(text) as unknown, retryCount, retryAfter };
    } catch (error) {
      const category = error instanceof Error ? error.message : "ATS_NETWORK_ERROR";
      if (attempt === 0 && (category === "ATS_NETWORK_ERROR" || category === "The operation was aborted.")) { retryCount += 1; continue; }
      throw error;
    } finally { clearTimeout(timer); }
  }
  throw new Error("ATS_REQUEST_FAILED");
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const sanitizeProviderError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "ATS_REQUEST_FAILED";
  if (/^ATS_(HTTP_(400|401|403|404|429|502|503|504)|ORIGIN_REJECTED|RESPONSE_TOO_LARGE)$/.test(message)) return message;
  if (/abort|timeout/i.test(message)) return "ATS_TIMEOUT";
  return "ATS_NETWORK_ERROR";
};

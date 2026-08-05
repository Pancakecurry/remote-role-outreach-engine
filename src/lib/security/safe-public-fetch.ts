import { promises as dns } from "node:dns";
import { isIP } from "node:net";
import { registrableDomain } from "@/lib/domain-resolution";

const privateV4 = (ip: string) => /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(ip);
const privateV6 = (ip: string) => ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd");
export function isSafePublicHostname(hostname: string) { const normalized = hostname.toLowerCase(); return Boolean(normalized) && !isIP(normalized) && normalized !== "localhost" && !normalized.endsWith(".local"); }
export async function assertPublicHostname(hostname: string) { if (!isSafePublicHostname(hostname)) throw new Error("UNSAFE_HOST"); const addresses = await dns.lookup(hostname, { all: true, verbatim: true }); if (addresses.length === 0 || addresses.some(({ address, family }) => family === 4 ? privateV4(address) : privateV6(address.toLowerCase()))) throw new Error("UNSAFE_DNS"); }
export async function fetchOfficialPublicPage(rawUrl: string, expectedDomain?: string) { const url = new URL(rawUrl); if (url.protocol !== "https:") throw new Error("HTTPS_REQUIRED"); await assertPublicHostname(url.hostname); const allowed = expectedDomain ? registrableDomain(expectedDomain) : registrableDomain(url.hostname); if (!allowed || registrableDomain(url.hostname) !== allowed) throw new Error("DOMAIN_MISMATCH"); const response = await fetch(url, { method: "GET", redirect: "manual", headers: { Accept: "text/html", "User-Agent": "RemoteRoleOutreachEngine/0.1 public-evidence-validation" }, signal: AbortSignal.timeout(12_000) }); if (response.status >= 300 && response.status < 400) { const location = response.headers.get("location"); if (!location) throw new Error("REDIRECT_INVALID"); const redirected = new URL(location, url); if (redirected.protocol !== "https:" || registrableDomain(redirected.hostname) !== allowed) throw new Error("REDIRECT_DOMAIN_REJECTED"); return fetchOfficialPublicPage(redirected.toString(), allowed); } if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error("FETCH_FAILED"); const body = await response.text(); if (Buffer.byteLength(body) > 750_000) throw new Error("RESPONSE_TOO_LARGE"); return { url: url.toString(), body };
}

/** Returns false only for a clear, applicable robots exclusion; unavailable robots are not treated as permission. */
export async function robotsAllowsOfficialPath(rawUrl: string, expectedDomain: string) {
  const target = new URL(rawUrl); const allowed = registrableDomain(expectedDomain);
  if (!allowed || target.protocol !== "https:" || registrableDomain(target.hostname) !== allowed) return false;
  await assertPublicHostname(target.hostname);
  try {
    const robots = new URL("/robots.txt", target);
    const response = await fetch(robots, { method: "GET", redirect: "manual", headers: { Accept: "text/plain", "User-Agent": "RemoteRoleOutreachEngine/0.1 public-evidence-validation" }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok || response.status >= 300) return true;
    const text = (await response.text()).slice(0, 64_000);
    let applies = false; const blocked: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      const [key, rawValue] = line.split(":", 2); const value = rawValue?.trim() ?? "";
      if (/^user-agent$/i.test(key.trim())) { applies = value === "*" || /RemoteRoleOutreachEngine/i.test(value); continue; }
      if (applies && /^disallow$/i.test(key.trim()) && value) blocked.push(value);
    }
    return !blocked.some((path) => path === "/" || target.pathname.startsWith(path));
  } catch { return true; }
}

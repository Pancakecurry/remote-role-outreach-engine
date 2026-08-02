import { describe, expect, it } from "vitest";
import { ashbyAdapter, greenhouseAdapter, leverAdapter } from "@/integrations/job-sources";
import { htmlToSafeText, isAllowedProviderUrl, jobSourceAdapters } from "@/integrations/job-sources";
import { missingJobTransition } from "@/lib/job-lifecycle";
import { constantTimeTokenMatches, ingestionLockAllowsStart, ingestionRequestSchema } from "@/lib/internal-automation";

const source = (provider: "GREENHOUSE" | "LEVER" | "ASHBY", boardIdentifier: string) => ({ id: "00000000-0000-4000-8000-000000000001", provider, companyName: "Synthetic Company", companyDomain: "synthetic.example.org", boardIdentifier, providerRegion: provider === "LEVER" ? "GLOBAL" as const : null, enabled: true, isDemo: false as const });
describe("public ATS adapters", () => {
  it("normalizes Greenhouse, Lever, and Ashby fixtures", () => {
    expect(greenhouseAdapter.normalizeJob({ id: 1, title: "AI Engineer", absolute_url: "https://boards.greenhouse.io/example/jobs/1", content: "<h2>Build</h2><script>bad()</script>", location: { name: "Remote" } }, source("GREENHOUSE", "example")).descriptionText).toContain("Build");
    expect(leverAdapter.normalizeJob({ id: "lever-1", text: "Backend AI", hostedUrl: "https://jobs.lever.co/example/a", applyUrl: "https://jobs.lever.co/example/a/apply", descriptionPlain: "Safe text", categories: { location: "Remote" } }, source("LEVER", "example")).workplaceType).toBe("REMOTE");
    expect(ashbyAdapter.normalizeJob({ id: "ashby-1", title: "Applied AI", jobUrl: "https://jobs.ashbyhq.com/example/1", applyUrl: "https://jobs.ashbyhq.com/example/1/apply", descriptionHtml: "<p>Safe</p>" }, source("ASHBY", "example")).externalJobId).toBe("ashby-1");
  });
  it("isolates malformed jobs and rejects unsafe identifiers and origins", () => {
    expect(() => greenhouseAdapter.normalizeJob({ id: 1 }, source("GREENHOUSE", "example"))).toThrow();
    expect(jobSourceAdapters.GREENHOUSE.validateSource(source("GREENHOUSE", "bad/token")).success).toBe(false);
    expect(isAllowedProviderUrl("https://boards-api.greenhouse.io/v1/boards/example/jobs")).toBe(true);
    expect(isAllowedProviderUrl("http://localhost:3000/evil")).toBe(false);
  });
  it("converts hostile HTML to inert readable text", () => { const text = htmlToSafeText("<h1>Role</h1><form>ignore</form><script>ignore</script><ul><li>One</li></ul>"); expect(text).toContain("Role"); expect(text).toContain("One"); expect(text).not.toContain("ignore"); });
});
describe("job lifecycle", () => {
  it("closes only after three successful misses and reopens on reappearance", () => {
    expect(missingJobTransition(0, true, false)).toMatchObject({ runs: 1, active: true, closed: false });
    expect(missingJobTransition(1, false, false)).toMatchObject({ runs: 1, active: true, closed: false });
    expect(missingJobTransition(2, true, false)).toMatchObject({ runs: 3, active: false, closed: true });
    expect(missingJobTransition(3, true, true)).toMatchObject({ runs: 0, active: true, closed: false });
  });
});
describe("internal ingestion controls", () => {
  it("requires a matching token and a narrow request body", () => { expect(constantTimeTokenMatches("token", "token")).toBe(true); expect(constantTimeTokenMatches("wrong", "token")).toBe(false); expect(ingestionRequestSchema.safeParse({ mode: "write", outreach: true }).success).toBe(false); });
  it("rejects an overlapping ingestion lock", () => { expect(ingestionLockAllowsStart(true)).toBe(false); expect(ingestionLockAllowsStart(false)).toBe(true); });
});

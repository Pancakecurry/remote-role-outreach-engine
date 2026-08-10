import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("end-to-end orchestration contract", () => {
  it("keeps one inactive unified canvas and leaves Gmail behind an application claim", async () => {
    const [workflow, queue, auth] = await Promise.all([
      readFile(join(root, "n8n/workflows/remote_role_acquisition_engine.json"), "utf8"),
      readFile(join(root, "src/services/outreach-queue.ts"), "utf8"),
      readFile(join(root, "src/lib/internal-route.ts"), "utf8"),
    ]);
    expect(workflow).toContain('"name": "Remote Role Acquisition Engine"');
    expect(workflow).toContain('"active": false');
    expect(workflow).toContain("0 17 * * *");
    expect(workflow).toContain("/api/internal/jobs/ingest");
    expect(workflow).toContain("/api/internal/outreach/claim");
    expect(workflow).not.toContain("executeWorkflow");
    expect(queue).toContain("DRY_RUN_AUTOSEND_DISABLED");
    expect(queue).toContain("claim_lease_expires_at");
    expect(auth).toContain("x-internal-automation-token");
  });
});

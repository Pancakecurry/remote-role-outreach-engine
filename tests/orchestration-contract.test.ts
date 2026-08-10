import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("end-to-end orchestration contract", () => {
  it("keeps one inactive 5 PM master and leaves Gmail behind an application claim", async () => {
    const [master, queue, auth] = await Promise.all([
      readFile(join(root, "n8n/workflows/00_remote_role_acquisition_master.json"), "utf8"),
      readFile(join(root, "src/services/outreach-queue.ts"), "utf8"),
      readFile(join(root, "src/lib/internal-route.ts"), "utf8"),
    ]);
    expect(master).toContain('"active": false');
    expect(master).toContain("0 17 * * *");
    expect(master).toContain("/api/internal/pipeline/master");
    expect(queue).toContain("DRY_RUN_AUTOSEND_DISABLED");
    expect(queue).toContain("claim_lease_expires_at");
    expect(auth).toContain("x-internal-automation-token");
  });
});

import { execFileSync } from "node:child_process";
const commands = ["verify:supabase", "verify:owner", "verify:ingestion", "verify:qualification", "verify:contacts", "verify:outreach", "verify:self-test", "verify:n8n-workflows", "verify:stack", "verify:release-candidate"];
let pass = true; for (const command of commands) { try { execFileSync("npm", ["run", command], { stdio: "ignore" }); } catch { pass = false; } }
console.log(`PRODUCTION_READINESS: ${pass ? "READY_FOR_MANUAL_SELF_TEST" : "NOT_READY"}`);
console.log("PRODUCTION_MODE: DRY_RUN_AUTOSEND_DISABLED");
if (!pass) process.exitCode = 1;

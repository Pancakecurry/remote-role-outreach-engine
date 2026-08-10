import { inspectUnifiedN8nWorkflow } from "./unified-n8n-contract";

async function main() {
  try {
    const result = await inspectUnifiedN8nWorkflow();
    const pass = Object.values(result.checks).every(Boolean);
    console.log("N8N_WORKFLOWS_CANONICAL: Remote Role Acquisition Engine");
    console.log(`N8N_WORKFLOWS_COUNT: 1`);
    console.log(`N8N_MASTER_ORCHESTRATION: ${result.checks.parity00 ? "PASS" : "FAIL"}`);
    console.log(`N8N_SELF_TEST_GUARDS: ${result.checks.selfTestIsolation ? "PASS" : "FAIL"}`);
    console.log(`N8N_GMAIL_TEMPLATES: ${result.checks.gmailBranches ? "PASS" : "FAIL"}`);
    console.log(`N8N_WORKFLOWS_VALID: ${pass ? "PASS" : "FAIL"}`);
    if (!pass) process.exitCode = 1;
  } catch {
    console.log("N8N_WORKFLOWS_VALID: FAIL");
    process.exitCode = 1;
  }
}

void main();

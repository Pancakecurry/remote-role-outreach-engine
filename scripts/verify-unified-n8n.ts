import { inspectUnifiedN8nWorkflow } from "./unified-n8n-contract";

async function main() {
  try {
    const result = await inspectUnifiedN8nWorkflow();
    const check = (name: string) => result.checks[name] ? "PASS" : "FAIL";
    console.log(`UNIFIED_N8N_NODES: ${result.nodeCount}`);
    console.log(`UNIFIED_N8N_TRIGGERS: ${result.triggerCount}`);
    console.log(`UNIFIED_N8N_CANONICAL: ${check("canonicalFile")}`);
    console.log(`UNIFIED_N8N_INACTIVE: ${check("inactive")}`);
    console.log(`UNIFIED_N8N_SCHEDULES: ${["dailyTrigger", "timezone", "sendTrigger", "inboxTrigger", "followupTrigger", "operationsTrigger", "selfTestTrigger"].every((name) => result.checks[name]) ? "PASS" : "FAIL"}`);
    console.log(`UNIFIED_N8N_ENDPOINTS: ${check("applicationEndpoints")}`);
    console.log(`UNIFIED_N8N_GMAIL_GATES: ${["gmailBranches", "replyBounceOptOut", "followupLimit", "selfTestIsolation"].every((name) => result.checks[name]) ? "PASS" : "FAIL"}`);
    console.log(`UNIFIED_N8N_SAFETY: ${["operationalOnly", "noExecuteWorkflow", "noEmbeddedCredentials", "supabaseSourceOfTruth", "noAtsWrites", "noLinkedIn", "noGuessedEmail", "noPaidProvider"].every((name) => result.checks[name]) ? "PASS" : "FAIL"}`);
    console.log(`UNIFIED_N8N_LEGACY_PARITY: ${["legacyArchive", "parity00", "parity01", "parity02", "parity03", "parity04", "parity05", "parity06", "parity07", "parity08", "parity09"].every((name) => result.checks[name]) ? "PASS" : "FAIL"}`);
    const pass = Object.values(result.checks).every(Boolean);
    console.log(`UNIFIED_N8N_VERIFY: ${pass ? "PASS" : "FAIL"}`);
    if (!pass) process.exitCode = 1;
  } catch {
    console.log("UNIFIED_N8N_VERIFY: FAIL");
    process.exitCode = 1;
  }
}

void main();

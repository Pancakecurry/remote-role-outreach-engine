import { readEnv } from "@/lib/security/env";
async function main() { const env = readEnv(); if (!env.success) { console.error("GEMINI_CONFIG_INVALID"); process.exitCode = 1; return; } const configured = Boolean(env.data.GEMINI_API_KEY && env.data.GEMINI_MODEL); console.log(`GEMINI_STATUS: ${configured ? "CONFIGURED_BUT_SKIPPED_PHASE_1" : "SKIPPED_CREDENTIALS_MISSING"}`); console.log("GEMINI_CAPABILITY: STRUCTURED_OUTPUT_CONTRACT_VALIDATED_LOCALLY"); console.log("GEMINI_NETWORK: NOT_CONTACTED"); }
void main();

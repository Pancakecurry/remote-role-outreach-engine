import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { readEnv } from "@/lib/security/env";
loadProjectEnvironment();
const result = readEnv(); const keys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "APP_OWNER_USER_ID", "GEMINI_API_KEY", "GEMINI_MODEL", "GMAIL_SENDER_ADDRESS", "N8N_ENCRYPTION_KEY"];
if (!result.success) { console.log("ENVIRONMENT: INVALID FORMAT"); for (const key of keys) console.log(`${key}: ${process.env[key]?.trim() ? "INVALID FORMAT" : "MISSING"}`); process.exitCode = 1; } else { console.log("ENVIRONMENT: CONFIGURED"); for (const key of keys) console.log(`${key}: ${process.env[key]?.trim() ? "CONFIGURED" : "MISSING"}`); console.log(`OUTREACH_MODE: ${result.data.OUTREACH_MODE === "dry_run" ? "CONFIGURED" : "INVALID FORMAT"}`); console.log(`AUTOSEND_ENABLED: ${result.data.AUTOSEND_ENABLED === "false" ? "CONFIGURED" : "INVALID FORMAT"}`); }

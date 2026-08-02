import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { assertDemoGuards } from "@/lib/security/demo-guards";

export function requireDemoGuards() { loadProjectEnvironment(); return assertDemoGuards({ APP_OWNER_USER_ID: process.env.APP_OWNER_USER_ID, OUTREACH_MODE: process.env.OUTREACH_MODE, AUTOSEND_ENABLED: process.env.AUTOSEND_ENABLED }); }

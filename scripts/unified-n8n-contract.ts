import { promises as fs } from "node:fs";
import { join } from "node:path";

const canonicalPath = join(process.cwd(), "n8n/workflows/remote_role_acquisition_engine.json");
const legacyDirectory = join(process.cwd(), "n8n/legacy-workflows");

export type UnifiedN8nInspection = {
  checks: Record<string, boolean>;
  nodeCount: number;
  triggerCount: number;
};

export async function inspectUnifiedN8nWorkflow(): Promise<UnifiedN8nInspection> {
  const raw = await fs.readFile(canonicalPath, "utf8");
  const workflow = JSON.parse(raw) as { name?: string; active?: boolean; nodes?: Array<{ name?: string; type?: string; parameters?: Record<string, unknown> }> };
  const nodes = workflow.nodes ?? [];
  const names = nodes.map((node) => node.name ?? "");
  const types = nodes.map((node) => node.type ?? "");
  const schedules = nodes.filter((node) => node.type === "n8n-nodes-base.scheduleTrigger");
  const hasEndpoint = (path: string) => raw.includes(path);
  const legacyFiles = (await fs.readdir(legacyDirectory)).filter((file) => /^\d\d_.*\.json$/.test(file));
  const legacy = new Set(legacyFiles.map((file) => file.slice(0, 2)));
  const hasName = (value: string) => names.some((name) => name.includes(value));

  const checks: Record<string, boolean> = {
    canonicalFile: workflow.name === "Remote Role Acquisition Engine",
    inactive: workflow.active === false,
    dailyTrigger: schedules.some((node) => JSON.stringify(node.parameters).includes("0 17 * * *")),
    timezone: JSON.stringify(workflow).includes("Asia/Kolkata"),
    sendTrigger: hasName("Poll Production Send Queue Every 15 Minutes"),
    inboxTrigger: hasName("Poll Gmail Inbox Every 15 Minutes"),
    followupTrigger: hasName("Run Follow-Up Eligibility Every Hour"),
    operationsTrigger: hasName("Read Operations Health Every Hour"),
    selfTestTrigger: types.includes("n8n-nodes-base.manualTrigger") && hasName("Self-Test"),
    operationalOnly: !hasName("SHOWCASE DEMO") && !raw.includes("SEND BLOCKED — SHOWCASE MODE"),
    noExecuteWorkflow: !types.some((type) => /executeWorkflow/i.test(type)),
    noEmbeddedCredentials: !/credentialId|client_secret|refresh_token|authorization\s*[:=]\s*["'][^"']+/i.test(raw),
    applicationEndpoints: ["/api/internal/jobs/ingest", "/api/internal/pipeline/qualify", "/api/internal/pipeline/contacts", "/api/internal/pipeline/drafts", "/api/internal/outreach/claim", "/api/internal/outreach/mark-sent", "/api/internal/outreach/mark-failed", "/api/internal/gmail/events", "/api/internal/followups/schedule", "/api/internal/operations/status", "/api/internal/outreach/self-test-prepare", "/api/internal/outreach/self-test-claim", "/api/internal/outreach/self-test-event"].every(hasEndpoint),
    gmailBranches: types.filter((type) => type === "n8n-nodes-base.gmail").length >= 3 && hasName("Claim Production Messages") && hasName("Send Claimed Gmail Message"),
    replyBounceOptOut: hasName("Process Reply Bounce & Opt-Out Event") && hasName("Application Cancels Terminal Sequences"),
    followupLimit: raw.includes("two-follow-up gates") && hasName("Find Due Follow-Ups & Recheck Eligibility"),
    selfTestIsolation: raw.includes("is_test\\\":true") && hasName("Claim At Most One Isolated Test"),
    supabaseSourceOfTruth: raw.includes("Supabase is the source of truth") && !/supabase.*(insert|update|delete)/i.test(raw),
    noAtsWrites: !/api\/internal\/ats\/|applications\/(?:submit|apply)/i.test(raw),
    noLinkedIn: !/linkedin/i.test(raw),
    noGuessedEmail: !/infer(?:red)? email|guess(?:ed)? email/i.test(raw),
    noPaidProvider: !/apollo|hunter|snov|rocketreach|zoominfo|clay/i.test(raw),
    legacyArchive: legacy.size === 10 && ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09"].every((item) => legacy.has(item)),
    parity00: hasName("Daily 5 PM Asia Kolkata") && hasEndpoint("/api/internal/jobs/ingest"),
    parity01: hasEndpoint("/api/internal/jobs/ingest"),
    parity02: hasEndpoint("/api/internal/pipeline/qualify"),
    parity03: hasEndpoint("/api/internal/pipeline/contacts"),
    parity04: hasEndpoint("/api/internal/pipeline/drafts"),
    parity05: hasEndpoint("/api/internal/outreach/claim") && hasEndpoint("/api/internal/outreach/mark-sent") && hasEndpoint("/api/internal/outreach/mark-failed"),
    parity06: hasEndpoint("/api/internal/gmail/events") && hasName("Read Recent Gmail Metadata"),
    parity07: hasEndpoint("/api/internal/followups/schedule"),
    parity08: hasEndpoint("/api/internal/operations/status"),
    parity09: hasEndpoint("/api/internal/outreach/self-test-prepare") && hasEndpoint("/api/internal/outreach/self-test-claim") && hasEndpoint("/api/internal/outreach/self-test-event"),
  };

  return { checks, nodeCount: nodes.length, triggerCount: schedules.length + nodes.filter((node) => node.type === "n8n-nodes-base.manualTrigger").length };
}

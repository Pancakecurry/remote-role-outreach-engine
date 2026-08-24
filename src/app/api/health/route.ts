import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function classifyDatabaseFailure(error: unknown): "AUTHORIZATION" | "NETWORK_UNAVAILABLE" | "SCHEMA_UNAVAILABLE" | "QUERY_UNAVAILABLE" {
  const record = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
  if (code === "42P01" || code === "PGRST205") return "SCHEMA_UNAVAILABLE";
  if (/jwt|api key|permission|authorization|not allowed|invalid key/.test(message) || /^PGRST30[01]$/.test(code)) return "AUTHORIZATION";
  if (/fetch failed|network|enotfound|econnrefused|etimedout|socket/.test(message)) return "NETWORK_UNAVAILABLE";
  return "QUERY_UNAVAILABLE";
}

export async function GET(request: Request) {
  const livenessOnly = new URL(request.url).searchParams.get("readiness") === "0";
  let databaseReachable = false;
  let databaseFailure: "NOT_CONFIGURED" | "TIMEOUT" | "AUTHORIZATION" | "NETWORK_UNAVAILABLE" | "SCHEMA_UNAVAILABLE" | "QUERY_UNAVAILABLE" | null = null;
  if (!livenessOnly) {
    try {
      const result = await Promise.race([
        createAdminSupabaseClient().from("system_settings").select("owner_id", { count: "exact", head: true }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("HEALTH_TIMEOUT")), 12_000)),
      ]);
      databaseReachable = !result.error;
      if (!databaseReachable) databaseFailure = classifyDatabaseFailure(result.error);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      databaseFailure = message === "SUPABASE_ADMIN_NOT_CONFIGURED" ? "NOT_CONFIGURED" : message === "HEALTH_TIMEOUT" ? "TIMEOUT" : "QUERY_UNAVAILABLE";
    }
  }
  // Liveness must not flap when the optional readiness probe reaches a transient database timeout.
  return NextResponse.json({ application: "healthy", database: livenessOnly ? "not_checked" : databaseReachable ? "reachable" : "unavailable", databaseFailure, mode: process.env.OUTREACH_MODE === "live" ? "live" : "dry_run", autosend: process.env.AUTOSEND_ENABLED === "true" ? "enabled" : "disabled", timestamp: new Date().toISOString() });
}

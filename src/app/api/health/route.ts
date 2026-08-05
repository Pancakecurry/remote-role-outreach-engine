import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export async function GET() {
  let databaseReachable = false;
  try {
    const result = await Promise.race([
      createAdminSupabaseClient().from("system_settings").select("owner_id", { count: "exact", head: true }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("HEALTH_TIMEOUT")), 3_000)),
    ]);
    databaseReachable = !result.error;
  } catch { /* Health responses intentionally omit provider detail. */ }
  // Liveness must not flap when the optional readiness probe reaches a transient database timeout.
  return NextResponse.json({ application: "healthy", database: databaseReachable ? "reachable" : "unavailable", mode: process.env.OUTREACH_MODE === "live" ? "live" : "dry_run", autosend: process.env.AUTOSEND_ENABLED === "true" ? "enabled" : "disabled", timestamp: new Date().toISOString() });
}

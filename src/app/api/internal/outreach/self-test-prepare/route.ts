import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const inputSchema = z.object({ is_test: z.literal(true), recipient: z.string().email() });
const matches = (provided: string | null, expected: string | undefined) => Boolean(provided && expected && provided.length === expected.length && timingSafeEqual(Buffer.from(provided), Buffer.from(expected)));
const testAllowed = (recipient: string) => process.env.SELF_TEST_MODE === "true" && Boolean(process.env.SELF_TEST_RECIPIENT) && recipient === process.env.SELF_TEST_RECIPIENT && recipient === process.env.GMAIL_SENDER_ADDRESS;

export async function POST(request: Request) {
  if (!matches(request.headers.get("x-internal-automation-token"), process.env.INTERNAL_AUTOMATION_TOKEN)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!parsed.success || !owner.success || !testAllowed(parsed.data.recipient)) return NextResponse.json({ error: "SELF_TEST_GUARD_REJECTED" }, { status: 403 });
  const delay = Math.min(60, Math.max(1, Number.parseInt(process.env.SELF_TEST_FOLLOWUP_DELAY_MINUTES ?? "5", 10) || 5));
  const db = createAdminSupabaseClient();
  const subject = "[SELF TEST — NOT OUTREACH] Controlled Gmail integration check";
  const body = "[SELF TEST — NOT OUTREACH]\n\nThis isolated test verifies the local workflow only. It is not a company outreach message.";
  const result = await db.from("self_test_sequences").upsert({ owner_id: owner.data, recipient: parsed.data.recipient, state: "PREPARED", subject, body_text: body, is_test: true, claim_token: null, claimed_at: null, lease_expires_at: null, gmail_message_id: null, gmail_thread_id: null, next_action_at: new Date(Date.now() + delay * 60_000).toISOString(), replied_at: null, bounced_at: null, opted_out_at: null }, { onConflict: "owner_id,recipient" }).select("id").single();
  if (result.error || !result.data) return NextResponse.json({ error: "SELF_TEST_UNAVAILABLE" }, { status: 503 });
  const hash = createHash("sha256").update(`self-test-prepared:${result.data.id}`).digest("hex");
  await db.from("integration_events").upsert({ owner_id: owner.data, integration: "self_test", event_type: "PREPARED", status: "INFO", dedup_hash: hash, detail: { isolated: true } }, { onConflict: "owner_id,integration,dedup_hash" });
  return NextResponse.json({ prepared: 1, isTest: true });
}

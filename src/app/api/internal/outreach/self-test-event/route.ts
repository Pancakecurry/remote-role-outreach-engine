import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const inputSchema = z.object({ id: z.string().uuid(), claimToken: z.string().uuid(), event: z.enum(["SENT", "REPLIED", "BOUNCED", "OPTED_OUT", "FAILED"]), gmailMessageId: z.string().max(200).optional(), gmailThreadId: z.string().max(200).optional() });
const matches = (provided: string | null, expected: string | undefined) => Boolean(provided && expected && provided.length === expected.length && timingSafeEqual(Buffer.from(provided), Buffer.from(expected)));
export async function POST(request: Request) {
  if (!matches(request.headers.get("x-internal-automation-token"), process.env.INTERNAL_AUTOMATION_TOKEN)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null)); const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!parsed.success || !owner.success) return NextResponse.json({ error: "SELF_TEST_EVENT_REJECTED" }, { status: 400 });
  const state = parsed.data.event === "SENT" ? "SENT" : parsed.data.event;
  const cancellation = state === "REPLIED" || state === "BOUNCED" || state === "OPTED_OUT";
  const db = createAdminSupabaseClient(); const result = await db.from("self_test_sequences").update({ state, gmail_message_id: parsed.data.gmailMessageId ?? null, gmail_thread_id: parsed.data.gmailThreadId ?? null, claim_token: null, lease_expires_at: null, next_action_at: cancellation ? null : undefined, replied_at: state === "REPLIED" ? new Date().toISOString() : null, bounced_at: state === "BOUNCED" ? new Date().toISOString() : null, opted_out_at: state === "OPTED_OUT" ? new Date().toISOString() : null }).eq("owner_id", owner.data).eq("id", parsed.data.id).eq("is_test", true).eq("claim_token", parsed.data.claimToken).select("id").maybeSingle();
  if (result.error || !result.data) return NextResponse.json({ error: "SELF_TEST_EVENT_REJECTED" }, { status: 409 });
  return NextResponse.json({ updated: 1, isTest: true });
}

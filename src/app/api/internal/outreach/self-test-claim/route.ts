import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const payloadSchema = z.object({ is_test: z.literal(true), recipient: z.string().email(), batchSize: z.literal(1) });
const tokenMatches = (provided: string | null, expected: string | undefined) => Boolean(provided && expected && provided.length === expected.length && timingSafeEqual(Buffer.from(provided), Buffer.from(expected)));
export async function POST(request: Request) {
  if (!tokenMatches(request.headers.get("x-internal-automation-token"), process.env.INTERNAL_AUTOMATION_TOKEN)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!parsed.success || !owner.success || process.env.SELF_TEST_MODE !== "true" || !process.env.SELF_TEST_RECIPIENT || parsed.data.recipient !== process.env.SELF_TEST_RECIPIENT || parsed.data.recipient !== process.env.GMAIL_SENDER_ADDRESS) return NextResponse.json({ error: "SELF_TEST_GUARD_REJECTED" }, { status: 403 });
  const db = createAdminSupabaseClient(); const token = randomUUID(); const lease = new Date(Date.now() + 5 * 60_000).toISOString();
  const claimed = await db.from("self_test_sequences").update({ state: "CLAIMED", claim_token: token, claimed_at: new Date().toISOString(), lease_expires_at: lease }).eq("owner_id", owner.data).eq("recipient", parsed.data.recipient).eq("is_test", true).eq("state", "PREPARED").select("id,recipient,subject,body_text").maybeSingle();
  if (claimed.error) return NextResponse.json({ error: "SELF_TEST_UNAVAILABLE" }, { status: 503 });
  if (!claimed.data) return NextResponse.json({ claimed: 0, messages: [], reason: "NO_PREPARED_ISOLATED_SELF_TEST" });
  return NextResponse.json({ claimed: 1, messages: [{ id: claimed.data.id, recipient: claimed.data.recipient, subject: claimed.data.subject, bodyText: claimed.data.body_text, isTest: true, claimToken: token }] });
}

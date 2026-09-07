import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeInternal } from "@/lib/internal-route";
import { gmailEventTransition } from "@/lib/outreach/gmail-events";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const eventSchema = z.object({ gmailMessageId: z.string().trim().min(1).max(200), gmailThreadId: z.string().trim().min(1).max(200), eventType: z.enum(["INBOUND_REPLY", "BOUNCE", "AUTOMATIC_RESPONSE", "OPT_OUT", "UNKNOWN_INBOUND"]) });
export async function POST(request: Request) {
  const denied = authorizeInternal(request); if (denied) return denied;
  const parsed = eventSchema.safeParse(await request.json().catch(() => null)); const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!parsed.success || !owner.success) return NextResponse.json({ error: "EVENT_REJECTED" }, { status: 400 });
  const db = createAdminSupabaseClient(); const dedup = createHash("sha256").update(`gmail-event:${parsed.data.gmailMessageId}`).digest("hex");
  const existing = await db.from("integration_events").select("id", { count: "exact", head: true }).eq("owner_id", owner.data).eq("integration", "gmail_event").eq("dedup_hash", dedup);
  if (existing.error) return NextResponse.json({ error: "EVENT_UNAVAILABLE" }, { status: 503 });
  if ((existing.count ?? 0) > 0) return NextResponse.json({ accepted: 0, deduplicated: true });
  const reference = await db.from("gmail_thread_references").select("sequence_id").eq("owner_id", owner.data).eq("gmail_thread_id", parsed.data.gmailThreadId).maybeSingle();
  await db.from("integration_events").upsert({ owner_id: owner.data, integration: "gmail_event", event_type: parsed.data.eventType, status: reference.data ? "SUCCESS" : "INFO", dedup_hash: dedup, detail: { classified: parsed.data.eventType, matchedSequence: Boolean(reference.data) } }, { onConflict: "owner_id,integration,dedup_hash" });
  if (reference.error || !reference.data) return NextResponse.json({ accepted: 0, unmatched: true });
  const transition = gmailEventTransition(parsed.data.eventType);
  if (!transition.terminal || !transition.state) return NextResponse.json({ accepted: 1, stateChanged: false });
  const state = transition.state;
  const stamp = new Date().toISOString(); const update = { state, paused: true, next_action_at: null, next_followup_at: null, replied_at: state === "REPLIED" ? stamp : null, bounced_at: state === "BOUNCED" ? stamp : null, opted_out_at: state === "OPTED_OUT" ? stamp : null };
  const sequence = await db.from("outreach_sequences").select("email_candidate_id").eq("owner_id", owner.data).eq("id", reference.data.sequence_id).maybeSingle();
  const updated = await db.from("outreach_sequences").update(update).eq("owner_id", owner.data).eq("id", reference.data.sequence_id).eq("is_demo", false);
  if (updated.error) return NextResponse.json({ error: "EVENT_UNAVAILABLE" }, { status: 503 });
  if (transition.suppress && sequence.data?.email_candidate_id) { const candidate = await db.from("email_candidates").select("email").eq("owner_id", owner.data).eq("id", sequence.data.email_candidate_id).maybeSingle(); if (candidate.data?.email) await db.from("suppression_entries").upsert({ owner_id: owner.data, email: candidate.data.email, company_id: null, role_key: null, reason: state === "BOUNCED" ? "BOUNCE" : "OPT_OUT", active: true }, { onConflict: "owner_id,email,company_id,role_key" }); }
  return NextResponse.json({ accepted: 1, stateChanged: true });
}

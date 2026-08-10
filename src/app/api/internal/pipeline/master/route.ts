import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeInternal } from "@/lib/internal-route";
import { runDailyAcquisition } from "@/services/daily-acquisition";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = authorizeInternal(request); if (denied) return denied;
  const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!owner.success) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  try {
    const result = await runDailyAcquisition(owner.data);
    return NextResponse.json({ runId: result.runId, ingestion: { succeeded: result.ingestion.sourcesSucceeded, failed: result.ingestion.sourcesFailed }, qualification: { assessed: result.qualification.succeeded, selected: result.qualification.selected }, contacts: { eligible: result.contacts.eligible, candidates: result.contacts.candidates }, drafts: { generated: result.drafts.drafts, blocked: result.drafts.draftBlocked } });
  } catch { return NextResponse.json({ error: "PIPELINE_STAGE_FAILED" }, { status: 503 }); }
}

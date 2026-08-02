import { NextResponse } from "next/server";
import { z } from "zod";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { runJobIngestion } from "@/services/job-ingestion";
import { constantTimeTokenMatches, ingestionRequestSchema } from "@/lib/internal-automation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  loadProjectEnvironment();
  const expected = process.env.INTERNAL_AUTOMATION_TOKEN;
  if (!expected && process.env.NODE_ENV === "production") return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  if (expected && !constantTimeTokenMatches(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? request.headers.get("x-internal-automation-token"), expected)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (process.env.OUTREACH_MODE !== "dry_run") return NextResponse.json({ error: "OUTREACH_MODE_REJECTED" }, { status: 403 });
  const parsed = ingestionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const ownerId = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!ownerId.success) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  const result = await runJobIngestion(ownerId.data, { ...parsed.data, maxJobsPerSource: 250 });
  return NextResponse.json({ mode: parsed.data.mode, sourcesAttempted: result.sourcesAttempted, sourcesSucceeded: result.sourcesSucceeded, sourcesFailed: result.sourcesFailed, fetched: result.fetched, valid: result.valid, malformed: result.malformed, inserted: result.inserted, updated: result.updated, unchanged: result.unchanged, reopened: result.reopened, closed: result.closed, locked: result.locked }, { status: result.locked ? 409 : 200 });
}

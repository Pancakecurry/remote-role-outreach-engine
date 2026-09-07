import { NextResponse } from "next/server";
import { z } from "zod";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { runJobIngestion } from "@/services/job-ingestion";
import { ingestionRequestSchema } from "@/lib/internal-automation";
import { authorizeInternal } from "@/lib/internal-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  loadProjectEnvironment();
  const denied = authorizeInternal(request); if (denied) return denied;
  const parsed = ingestionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const ownerId = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!ownerId.success) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  const result = await runJobIngestion(ownerId.data, { ...parsed.data, maxJobsPerSource: 250 });
  return NextResponse.json({ mode: parsed.data.mode, ...result }, { status: result.locked ? 409 : result.failed ? 502 : 200 });
}

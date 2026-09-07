import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeInternal } from "@/lib/internal-route";
import { markDailySummarySent } from "@/services/daily-summary";

export const runtime = "nodejs";
const input = z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), gmailMessageId: z.string().min(1).max(500) }).strict();
export async function POST(request: Request) {
  const denied = authorizeInternal(request); if (denied) return denied;
  const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID); const parsed = input.safeParse(await request.json().catch(() => null));
  if (!owner.success) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const result = await markDailySummarySent(owner.data, parsed.data.day, parsed.data.gmailMessageId);
  return NextResponse.json(result, { status: result.updated ? 200 : 409 });
}

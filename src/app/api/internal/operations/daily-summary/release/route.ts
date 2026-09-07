import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeInternal } from "@/lib/internal-route";
import { releaseDailySummaryClaim } from "@/services/daily-summary";

export const runtime = "nodejs";
const input = z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict();
export async function POST(request: Request) {
  const denied = authorizeInternal(request); if (denied) return denied;
  const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID); const parsed = input.safeParse(await request.json().catch(() => null));
  if (!owner.success) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  return NextResponse.json(await releaseDailySummaryClaim(owner.data, parsed.data.day));
}

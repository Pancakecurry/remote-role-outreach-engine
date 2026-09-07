import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeInternal } from "@/lib/internal-route";
import { claimDailySummary } from "@/services/daily-summary";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = authorizeInternal(request); if (denied) return denied;
  const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!owner.success) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  try { return NextResponse.json(await claimDailySummary(owner.data)); } catch { return NextResponse.json({ error: "SUMMARY_UNAVAILABLE" }, { status: 503 }); }
}

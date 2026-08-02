import { NextResponse } from "next/server"; import { authorizeInternal } from "@/lib/internal-route";
export const runtime = "nodejs"; export async function POST(request: Request) { const denied = authorizeInternal(request); if (denied) return denied; return NextResponse.json({ updated: 0, reason: "NO_LIVE_SENDS_IN_TURN_A" }); }

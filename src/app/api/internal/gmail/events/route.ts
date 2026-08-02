import { NextResponse } from "next/server"; import { authorizeInternal } from "@/lib/internal-route";
export const runtime = "nodejs"; export async function POST(request: Request) { const denied = authorizeInternal(request); if (denied) return denied; return NextResponse.json({ accepted: 0, reason: "TURN_A_NO_GMAIL_OPERATIONS" }); }

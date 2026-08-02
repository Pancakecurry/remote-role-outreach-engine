import { NextResponse } from "next/server"; import { authorizeInternal } from "@/lib/internal-route";
export const runtime = "nodejs"; export async function POST(request: Request) { const denied = authorizeInternal(request); if (denied) return denied; return NextResponse.json({ claimed: 0, messages: [], reason: "DRY_RUN_AUTOSEND_DISABLED" }); }

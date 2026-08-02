import { NextResponse } from "next/server"; import { authorizeInternal } from "@/lib/internal-route";
export const runtime = "nodejs"; export async function GET(request: Request) { const denied = authorizeInternal(request); if (denied) return denied; return NextResponse.json({ outreachMode: "dry_run", autosendEnabled: false, deliveryEnabled: false }); }

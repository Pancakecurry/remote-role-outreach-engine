import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeInternal } from "@/lib/internal-route";
import { generateApplicationPackages } from "@/services/application-packages";
export async function POST(request: Request) { const denied = authorizeInternal(request); if (denied) return denied; const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID); if (!owner.success) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 }); try { return NextResponse.json(await generateApplicationPackages(owner.data, 15)); } catch { return NextResponse.json({ error: "PACKAGE_PIPELINE_FAILED" }, { status: 500 }); } }

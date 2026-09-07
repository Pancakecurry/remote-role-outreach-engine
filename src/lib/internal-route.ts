import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
export const INTERNAL_AUTOMATION_HEADER = "x-internal-automation-token";

/** Every n8n-to-app request uses the same Header Auth credential and header. */
export function authorizeInternal(request: Request) {
  const expected = process.env.INTERNAL_AUTOMATION_TOKEN;
  const provided = request.headers.get(INTERNAL_AUTOMATION_HEADER);
  if (!expected || !provided || expected.length !== provided.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return null;
}

export const deliveryModeAllowsSend = () => process.env.OUTREACH_MODE === "live" && process.env.OUTREACH_ENABLED === "true";

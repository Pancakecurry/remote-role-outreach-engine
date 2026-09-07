import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ packageId: string }> }) {
  const user = await getAuthenticatedUser(); if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { packageId } = await params; const db = await createServerSupabaseClient(); const row = await db.from("application_packages").select("tailored_resume_path").eq("id", packageId).maybeSingle(); if (row.error || !row.data?.tailored_resume_path) return NextResponse.json({ error: "RESUME_NOT_FOUND" }, { status: 404 });
  const root = resolve(/* turbopackIgnore: true */ process.env.RESUME_OUTPUT_DIR ?? "runtime/resumes"); const path = resolve(/* turbopackIgnore: true */ row.data.tailored_resume_path); if (path !== root && !path.startsWith(`${root}${sep}`)) return NextResponse.json({ error: "INVALID_RESUME_PATH" }, { status: 400 });
  try { const pdf = await readFile(/* turbopackIgnore: true */ path); return new NextResponse(pdf, { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="approved-resume-${packageId}.pdf"`, "cache-control": "private, no-store" } }); } catch { return NextResponse.json({ error: "RESUME_UNAVAILABLE" }, { status: 404 }); }
}

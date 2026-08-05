"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const statusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "APPLIED", "INTERVIEW", "REJECTED", "SKIPPED", "CLOSED"]);
export async function updateApplicationStatus(formData: FormData) {
  const input = z.object({ jobId: z.string().uuid(), status: statusSchema, note: z.string().trim().max(1000).optional() }).safeParse(Object.fromEntries(formData));
  if (!input.success) return;
  const user = await requireAuthenticatedUser(); const client = await createServerSupabaseClient();
  const { data: existing } = await client.from("jobs").select("application_status,applied_at").eq("id", input.data.jobId).eq("owner_id", user.id).maybeSingle();
  if (!existing) return;
  const { error } = await client.from("jobs").update({ application_status: input.data.status, application_notes: input.data.note || null, applied_at: input.data.status === "APPLIED" ? existing.applied_at ?? new Date().toISOString() : existing.applied_at }).eq("id", input.data.jobId).eq("owner_id", user.id);
  if (error) return;
  await client.from("job_application_history").insert({ owner_id: user.id, job_id: input.data.jobId, from_status: existing.application_status, to_status: input.data.status, note: input.data.note || null });
  revalidatePath("/jobs"); revalidatePath(`/jobs/${input.data.jobId}`);
}

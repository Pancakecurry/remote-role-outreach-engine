import "server-only";

import { redirect } from "next/navigation";
import { createServerSupabaseClient, isPublicSupabaseConfigured } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  if (!isPublicSupabaseConfigured()) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  return user;
}

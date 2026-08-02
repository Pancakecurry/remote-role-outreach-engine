"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient, isPublicSupabaseConfigured } from "@/lib/supabase/server";
import { loginInputSchema } from "@/lib/auth/login-validation";

type LoginState = { error: string | null };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginInputSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success || !isPublicSupabaseConfigured()) return { error: "Unable to sign in with those credentials." };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Unable to sign in with those credentials." };
  redirect("/dashboard");
}

export async function logout() { if (isPublicSupabaseConfigured()) { const supabase = await createServerSupabaseClient(); await supabase.auth.signOut(); } redirect("/login"); }

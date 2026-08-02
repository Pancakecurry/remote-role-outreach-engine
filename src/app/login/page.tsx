import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { isPublicSupabaseConfigured } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() { const user = await getAuthenticatedUser(); if (user) redirect("/dashboard"); const configured = isPublicSupabaseConfigured(); return <main className="mx-auto flex min-h-screen max-w-md items-center p-6"><section className="w-full rounded-xl border border-[var(--line)] bg-white p-7 shadow-sm"><p className="text-xs font-bold tracking-[.16em] text-[var(--accent)]">PRIVATE CRM</p><h1 className="mt-2 text-3xl font-bold">Sign in</h1><p className="mt-2 text-sm text-slate-600">Access is limited to the manually provisioned owner account.</p>{configured ? <LoginForm /> : <p className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Database setup required before sign-in is available.</p>}</section></main>; }

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertOperationalRuntime } from "@/lib/runtime-mode";

export function isPublicSupabaseConfigured() {
  assertOperationalRuntime();
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim());
}

export async function createServerSupabaseClient() {
  assertOperationalRuntime();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVER_NOT_CONFIGURED");
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(items) { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Components cannot write cookies; proxy refresh handles this. */ } },
    },
  });
}

import "server-only";

import { createClient } from "@supabase/supabase-js";

/** Reserved for named scripts and trusted automation. Never import into a client component. */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

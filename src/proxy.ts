import { NextResponse, type NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  try { return await refreshSupabaseSession(request); } catch { return NextResponse.next({ request }); }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

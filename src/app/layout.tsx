import type { Metadata } from "next";
import "./globals.css";
import { assertOperationalRuntime } from "@/lib/runtime-mode";

/**
 * Supabase configuration and authenticated cookies are injected when the
 * container starts. Rendering route segments dynamically prevents Docker's
 * build-time environment from being cached into any CRM page.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Remote Role Acquisition Engine", description: "Private operational CRM with dry-run outreach controls" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { assertOperationalRuntime(); return <html lang="en"><body>{children}</body></html>; }

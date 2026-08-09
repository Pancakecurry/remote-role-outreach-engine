import type { Metadata } from "next";
import "./globals.css";

/**
 * Supabase configuration and authenticated cookies are injected when the
 * container starts. Rendering route segments dynamically prevents Docker's
 * build-time environment from being cached into any CRM page.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Remote Role Outreach Engine", description: "Private dry-run outreach foundation" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

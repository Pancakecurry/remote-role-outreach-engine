import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Remote Role Outreach Engine", description: "Private dry-run outreach foundation" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

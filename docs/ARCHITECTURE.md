# Architecture

Next.js provides the private CRM shell. Supabase is the future source of truth with Auth/RLS ownership. n8n will orchestrate future scheduled operations; Gemini will return structured assessments and drafts; controlled public HTML extraction will produce evidence; Gmail will deliver and synchronize threads only in later phases.

All future external pages and job descriptions are untrusted input. Evidence, assessment, delivery, and suppression remain separate records. Browser clients never receive secret keys. Apollo was removed because it is a paid contact-data dependency and is not needed for this public-evidence-first architecture.

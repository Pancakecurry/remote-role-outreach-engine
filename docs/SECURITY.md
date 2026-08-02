# Security controls

Secrets stay in ignored local files. The application agent never opens or prints `.env.local`; runtime preflights report only sanitized statuses. The secret-key client is marked server-only and is not imported by client components or normal CRM repositories.

There is no public sign-up, social auth, reset flow, anonymous CRM access, or browser secret-key use. Protected routes use validated Supabase users, generic authentication failures, cookie refresh through `proxy.ts`, and RLS owner policies. Repository failures are sanitized before rendering.

Future fetching must enforce allowlists, redirect/size limits, and SSRF protections. LinkedIn scraping, guessed-email sending, SMTP probing, paid data brokers, and Gmail operations remain prohibited. Suppression, dry-run kill switch, rate limits, idempotency, and audit logs remain mandatory.

Demo scripts require a valid configured owner ID, `dry_run`, and disabled autosend. They operate only on explicitly marked synthetic records and cannot make a demo sequence live or autosend eligible. The owner completes authenticated browser QA without sharing credentials.

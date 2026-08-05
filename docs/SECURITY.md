# Security controls

Secrets stay in ignored local files. The application agent never opens or prints `.env.local`; runtime preflights report only sanitized statuses. The secret-key client is marked server-only and is not imported by client components or normal CRM repositories.

There is no public sign-up, social auth, reset flow, anonymous CRM access, or browser secret-key use. Protected routes use validated Supabase users, generic authentication failures, cookie refresh through `proxy.ts`, and RLS owner policies. Repository failures are sanitized before rendering.

Future fetching must enforce allowlists, redirect/size limits, and SSRF protections. LinkedIn scraping, guessed-email sending, SMTP probing, paid data brokers, and Gmail operations remain prohibited. Suppression, dry-run kill switch, rate limits, idempotency, and audit logs remain mandatory.

Demo scripts require a valid configured owner ID, `dry_run`, and disabled autosend. They operate only on explicitly marked synthetic records and cannot make a demo sequence live or autosend eligible. The owner completes authenticated browser QA without sharing credentials.

ATS ingestion accepts only configured Greenhouse, Lever, and Ashby identifiers, fixed HTTPS origins, GET requests, bounded JSON responses, and sanitized errors. It follows no redirects to arbitrary hosts and never posts to ATS application endpoints. Provider HTML is converted to inert text; raw payloads and applicant data are not retained. The internal orchestration route uses a constant-time token comparison when configured.

The release candidate keeps all claimed messages at zero while `OUTREACH_MODE=dry_run` or autosend is disabled. Draft creation requires stored public evidence, matching professional domain, MX presence, and approved factual claims. Gmail identifiers are never created by draft generation, and imported n8n templates are inactive with credential assignment left to the owner.

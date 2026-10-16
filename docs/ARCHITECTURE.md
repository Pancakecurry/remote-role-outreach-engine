# Architecture

The system is split into a private operational application and portable, credential-free workflow/configuration templates.

## Request and data boundaries

Next.js serves the owner-only CRM. Browser code uses the Supabase publishable key and authenticated cookies; protected routes validate the user and let row-level security enforce ownership. The Supabase secret key is restricted to server-only ingestion, scoring, packaging, and orchestration routes.

Every CRM row is owner-scoped. n8n calls narrow internal endpoints with a shared Header Auth token and never supplies an owner ID from workflow data. Candidate facts and search priorities load from ignored local JSON files; tracked files contain neutral examples only.

## Pipeline

1. Configured Greenhouse, Lever, and Ashby adapters fetch bounded public responses from fixed HTTPS origins.
2. Ingestion normalizes records, deduplicates by owner/source/role, updates source health and last-seen timestamps, and detects closures.
3. Deterministic gates reject only hard blockers. Gemini receives bounded job text and verified profile facts for structured fit assessment.
4. Ranking combines fit, role family, geography, compensation, freshness, experience, quality, competition, friction, employment potential, and mission usefulness.
5. Strong roles receive an idempotent application package and one selected owner-approved résumé.
6. Public-contact extraction records provenance and validation. Drafts remain non-sendable unless every evidence and safety gate passes.
7. n8n schedules acquisition, operations, summary, inbox, delivery, and follow-up branches. Environment and database switches remain authoritative.

## Safety model

Job pages are untrusted input. Provider requests enforce host allowlists, redirects and response limits; company-page extraction additionally checks DNS and same-domain behavior. The system does not automate LinkedIn, infer email patterns, probe SMTP, bypass CAPTCHAs, or submit applications without confirmation.

Dry-run mode, database settings, environment switches, idempotency keys, claim leases, suppression records, bounded send limits, and audit events provide defense in depth. Gmail credentials exist only in the operator's n8n instance.

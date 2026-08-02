# Remote Role Outreach Engine

## Current phase

Phase 3 adds a public ATS registry and read-only Greenhouse, Lever, and Ashby job ingestion. Jobs are normalized into the CRM with lifecycle and source-health tracking. Qualification, contact discovery, Gmail, n8n activation, applications, and outreach remain disabled.

Useful checks: `npm run verify:supabase`, `npm run verify:owner`, `npm run verify:demo`, and `npm run test:smoke`.

Private, zero-paid-contact-data CRM foundation. Phase 2B-1 deployed the audited Supabase migration through the Supabase CLI and verified the empty, RLS-protected remote foundation. Live discovery, crawling, Gmail, outreach, n8n execution, and production automation remain disabled.

Migration history is now authoritative. The next manual gate is creating the single owner user in Supabase Dashboard; there is no public sign-up flow.

## Commands

`npm run lint` · `npm run typecheck` · `npm test` · `npm run build` · `npm run preflight` · `npm run verify:supabase` · `npm run seed:demo` · `npm run seed:remove`

The demo scripts are dry-run guarded and must not be used until the migration is applied and `APP_OWNER_USER_ID` is configured. See [docs/MANUAL_SETUP.md](docs/MANUAL_SETUP.md) and [docs/PHASE_2A_ACCEPTANCE.md](docs/PHASE_2A_ACCEPTANCE.md).

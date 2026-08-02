# Remote Role Outreach Engine

Private, zero-paid-contact-data CRM foundation. Phase 2A adds server-side Supabase authentication, RLS-governed repositories, protected CRM routes, and safe data-setup states. Live discovery, crawling, Gmail, outreach, n8n execution, and production automation remain disabled.

Create the Supabase migration and the single owner user manually before using CRM data. There is no public sign-up flow.

## Commands

`npm run lint` · `npm run typecheck` · `npm test` · `npm run build` · `npm run preflight` · `npm run seed:demo` · `npm run seed:remove`

The demo scripts are dry-run guarded and must not be used until the migration is applied and `APP_OWNER_USER_ID` is configured. See [docs/MANUAL_SETUP.md](docs/MANUAL_SETUP.md) and [docs/PHASE_2A_ACCEPTANCE.md](docs/PHASE_2A_ACCEPTANCE.md).

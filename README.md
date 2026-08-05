# Remote Role Outreach Engine

## Current phase

The release candidate adds incremental Gemini qualification, a manual-application queue, bounded official-site contact evidence, validated outreach drafts, and inactive n8n templates. Applications remain manual. Delivery remains disabled in dry-run mode.

Useful checks: `npm run verify:supabase`, `npm run verify:owner`, `npm run verify:demo`, and `npm run test:smoke`.

Private, zero-paid-contact-data CRM for manual applications, bounded public-contact evidence, and guarded outreach operations. The local Docker stack keeps CRM and n8n owner-controlled; automatic delivery remains disabled until a separately authorized self-test and activation gate pass.

Migration history is now authoritative. The next manual gate is creating the single owner user in Supabase Dashboard; there is no public sign-up flow.

## Commands

`npm run lint` · `npm run typecheck` · `npm test` · `npm run build` · `npm run pipeline:qualify` · `npm run pipeline:contacts` · `npm run verify:production-readiness` · `npm run verify:stack`

The demo scripts are dry-run guarded and must not be used until the migration is applied and `APP_OWNER_USER_ID` is configured. See [docs/MANUAL_SETUP.md](docs/MANUAL_SETUP.md) and [docs/PHASE_2A_ACCEPTANCE.md](docs/PHASE_2A_ACCEPTANCE.md).

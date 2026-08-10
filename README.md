# Remote Role Outreach Engine

## Current phase

The release candidate now has one canonical n8n workflow: `Remote Role Acquisition Engine`. Its inactive visual canvas contains separate 5:00 PM acquisition, 15-minute delivery, 15-minute inbox, hourly follow-up, hourly operations, and manual isolated self-test triggers. Applications remain manual; delivery remains disabled in dry-run mode.

Useful checks: `npm run verify:supabase`, `npm run verify:owner`, `npm run verify:demo`, and `npm run test:smoke`.

Private, zero-paid-contact-data CRM for manual applications, bounded public-contact evidence, and guarded outreach operations. The local Docker stack keeps CRM and n8n owner-controlled; automatic delivery remains disabled until a separately authorized self-test and activation gate pass.

Migration history is authoritative and the single owner account is already provisioned. The next manual gate is the isolated Gmail self-test; there is no public sign-up flow.

## Commands

`npm run stack:start` · `npm run stack:verify` · `npm run pipeline:qualify` · `npm run pipeline:backfill -- --limit=50` · `npm run pipeline:contacts` · `npm run verify:unified-n8n` · `npm run verify:end-to-end` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`

The demo scripts are dry-run guarded and must not be used until the migration is applied and `APP_OWNER_USER_ID` is configured. See [docs/MANUAL_SETUP.md](docs/MANUAL_SETUP.md) and [docs/PHASE_2A_ACCEPTANCE.md](docs/PHASE_2A_ACCEPTANCE.md).

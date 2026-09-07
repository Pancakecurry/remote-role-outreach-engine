# Manual setup

Copy `.env.example` to ignored `.env.local`; never commit it. The audited migration was deployed through Supabase CLI in Phase 2B-1 and must not be re-applied through the Dashboard SQL Editor. Confirm the remote state with `npm run preflight:supabase` and `npm run verify:supabase`.

Create exactly one email/password user in Supabase Dashboard under Authentication → Users. Do not enable public sign-up. Copy that user’s UUID from the Dashboard into local `APP_OWNER_USER_ID` without placing it in source code. Then run `npm run preflight:supabase`, start the local app, and test `/login` with the owner account. Protected pages should redirect before login and show empty CRM states after login.

The Gemini diagnostic completed successfully with the configured model and schema-valid synthetic output. Keep `OUTREACH_MODE=dry_run` and `OUTREACH_ENABLED=false`. Do not start n8n, configure Gmail delivery, enable live fetching, or run demo seed commands until the owner setup is complete.

After setting the owner ID, run `npm run verify:owner`. Only a passing result permits `npm run seed:demo` and `npm run verify:demo`. Then complete [Phase 2B-2 manual QA](./PHASE_2B2_MANUAL_QA.md). Do not begin Phase 3 until that checklist passes.

For Phase 3, run `npm run sources:seed`, `npm run sources:verify`, and `npm run ingest:jobs`. Keep `OUTREACH_MODE=dry_run` and autosend disabled. The future n8n internal route requires `INTERNAL_AUTOMATION_TOKEN` in production-like deployments, but n8n remains inactive. Complete [Phase 3 manual QA](./PHASE_3_MANUAL_QA.md) before Phase 4.

For the local release candidate, start `docker compose up -d --build`, then run `npm run verify:stack` and `npm run verify:production-readiness`. Import the inactive workflow JSON only after creating a Header Auth credential with header name `x-internal-automation-token`; do not place its value in workflow JSON. See [the controlled integration gate](./TURN_A_MANUAL_INTEGRATION.md). Gmail remains off-limits until a separately authorized self-test.

Daily summaries are owner-only and disabled by default. Set `DAILY_SUMMARY_ENABLED=true` and an owned `DAILY_SUMMARY_RECIPIENT` only after the Gmail self-test and the separate owner authorization. The summary workflow claims one day at a time, records the Gmail message ID in the audit log, and may retry only after a recorded delivery failure.

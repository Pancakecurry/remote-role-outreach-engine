# Manual setup

Copy `.env.example` to ignored `.env.local`; never commit it. The audited migration was deployed through Supabase CLI in Phase 2B-1 and must not be re-applied through the Dashboard SQL Editor. Confirm the remote state with `npm run preflight:supabase` and `npm run verify:supabase`.

Create exactly one email/password user in Supabase Dashboard under Authentication → Users. Do not enable public sign-up. Copy that user’s UUID from the Dashboard into local `APP_OWNER_USER_ID` without placing it in source code. Then run `npm run preflight:supabase`, start the local app, and test `/login` with the owner account. Protected pages should redirect before login and show empty CRM states after login.

The Gemini diagnostic completed successfully with the configured model and schema-valid synthetic output. Keep `OUTREACH_MODE=dry_run` and `AUTOSEND_ENABLED=false`. Do not start n8n, configure Gmail delivery, enable live fetching, or run demo seed commands until the owner setup is complete.

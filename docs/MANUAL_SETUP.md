# Manual setup

Copy `.env.example` to ignored `.env.local`; never commit it. In Supabase Dashboard, create a project, set the project URL and publishable key locally, and keep the secret key server-only. Open SQL Editor, paste the reviewed `supabase/migrations/001_initial_schema.sql`, and run it manually. This repository never applies it.

After the migration succeeds, create exactly one email/password user in Supabase Dashboard under Authentication → Users. Do not enable public sign-up. Copy that user’s UUID from the Dashboard into local `APP_OWNER_USER_ID` without placing it in source code. Then run `npm run preflight:supabase`, start the local app, and test `/login` with the owner account. Protected pages should redirect before login and show empty CRM states after login.

Keep `OUTREACH_MODE=dry_run` and `AUTOSEND_ENABLED=false`. Do not start n8n, configure Gmail delivery, enable live fetching, or run demo seed commands until the migration and owner setup are complete.

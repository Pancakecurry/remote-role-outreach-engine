# Manual setup

Copy `.env.example` to ignored `.env.local` and create a separate ignored `n8n/docker/.env` from its example. Fill secrets locally; never commit them. Create Supabase, run the reviewed migration in Phase 2, then set `APP_OWNER_USER_ID` to the authenticated owner UUID. Configure Gemini and Google Cloud Gmail API/OAuth only in their respective later phases. n8n OAuth callback must use the local callback URL configured by n8n.

Start n8n manually from `n8n/docker` with `docker compose up -d`; stop with `docker compose down`. Back up `n8n_data` before upgrades using a Docker volume archive; restore only while n8n is stopped. Keep `AUTOSEND_ENABLED=false`, `OUTREACH_MODE=dry_run`, Gmail workflows, live fetching, and production schedule disabled through Phase 1.

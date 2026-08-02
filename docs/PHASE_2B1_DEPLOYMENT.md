# Phase 2B-1 deployment

The audited initial migration was deployed through Supabase CLI. Remote migration history is authoritative and read-only verification confirms the expected public tables, empty application state, blocked anonymous access, and no Auth users.

Run `npm run preflight:supabase` and `npm run verify:supabase` to repeat sanitized checks. The Gemini diagnostic confirmed API reachability, configured-model availability, and schema-valid synthetic output. No project reference, key, password, user ID, or sensitive endpoint parameter is documented here.

Public signup remains disabled. Phase 2B-2 adds a manual owner/profile verification gate and guarded synthetic demo data. Gmail activity, live discovery, n8n workflow, and production automation remain inactive. Authenticated browser QA must pass before Phase 3.

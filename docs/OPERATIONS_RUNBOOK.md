# Operations runbook

Use `npm run stack:start`, `stack:stop`, `stack:restart`, `stack:status`, `stack:logs`, and `stack:verify` for the local stack. The n8n volume is persistent; back it up only while stopped and preserve the existing `N8N_ENCRYPTION_KEY` when restoring.

Use `/api/health` and n8n `/healthz` for health checks. Reconnect Gmail OAuth only through n8n’s owner-managed UI. For Gemini/provider failures, inspect aggregate assessment categories and rerun the bounded resumable backfill; do not print provider payloads. For Supabase failures, keep autosend disabled and restore only after read/write health checks pass.

Recover stale locks only after confirming no assessment process is running. The emergency kill switch is `AUTOSEND_ENABLED=false` plus pausing workflows 01, 05, 06, and 07. Rotate the internal token manually in runtime configuration and the Header Auth credential together. A sleeping/offline desktop cannot run scheduled work; review source health, application queue, contacts, replies, and operations daily, and back up n8n weekly.

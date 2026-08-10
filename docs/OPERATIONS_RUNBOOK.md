# Operations runbook

Use `npm run stack:start`, `stack:stop`, `stack:restart`, `stack:status`, `stack:logs`, and `stack:verify` for the local stack. The n8n volume is persistent; back it up only while stopped and preserve the existing `N8N_ENCRYPTION_KEY` when restoring. In the Compose stack, n8n uses `http://app:3000`; use `http://host.docker.internal:3000` only when n8n runs separately from the app container.

`00_remote_role_acquisition_master` is the sole daily 5:00 PM Asia/Kolkata workflow. It calls the application master pipeline, which records one workflow run and safely stops later stages if ingestion, qualification, contacts, or drafting fails. `01_daily_job_discovery` remains an inactive manual modular fallback. Workflow 05 polls claims, 06 polls sanitized inbound metadata, 07 creates due follow-up states, and 08 reads operations status; they do not decide eligibility or send safety.

Credential assignment matrix: `00`, `01`, `02`, `03`, `04`, `07`, and `08` use the shared Header Auth credential only. `05`, `06`, and `09` use that Header Auth credential plus the owner-assigned `Gmail Outreach — Dedicated` credential. No credential IDs or secret values belong in workflow JSON.

Use `/api/health` and n8n `/healthz` for health checks. Reconnect Gmail OAuth only through n8n’s owner-managed UI. For Gemini/provider failures, inspect aggregate assessment categories and rerun the bounded resumable backfill; do not print provider payloads. For Supabase failures, keep autosend disabled and restore only after read/write health checks pass.

Recover stale locks only after confirming no assessment process is running. The emergency kill switch is `AUTOSEND_ENABLED=false` plus pausing workflows 00, 05, 06, and 07. Rotate the internal token manually in runtime configuration and the single Header Auth credential together; its exact header name is `X-Internal-Automation-Token`. A sleeping/offline desktop cannot run scheduled work; due follow-ups are rechecked after recovery, without duplicate claims. Review `npm run verify:end-to-end` and operations status daily, and back up n8n weekly.

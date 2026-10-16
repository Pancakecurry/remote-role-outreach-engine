# Operations runbook

## Start and stop

Use `./scripts/start-job-engine.sh` and `./scripts/stop-job-engine.sh`. The latter preserves Docker volumes. Health endpoints are `/api/health` for the app and `/healthz` for n8n. Scheduled work stops while the host is asleep or offline.

The canonical n8n workflow runs discovery every four hours, delivery and inbox polls every 15 minutes, follow-up and operations checks hourly, and owner-summary preparation at 19:00 Asia/Kolkata. Importing the public workflow does not assign credentials or enable consequential actions.

## Safety controls

- Emergency stop: set `OUTREACH_ENABLED=false`, keep `AUTO_SUBMIT_ENABLED=false`, and pause the n8n workflow.
- Gmail credentials are managed only in n8n. Rotate the internal token in runtime configuration and Header Auth together.
- Recover stale locks only after confirming no pipeline execution is active.
- Treat a possible-send/failed-record outcome as uncertain; reconcile Gmail before retrying.
- A sleeping desktop catches up only after restarting and rechecking idempotency and eligibility.

## Routine checks

```bash
npm run stack:verify
npm run verify:unified-n8n
npm run verify:end-to-end
npm run pipeline:status
```

Inspect aggregate failure categories rather than provider payloads or email contents. Back up n8n only while stopped and preserve the local encryption key.

## Public-release privacy check

Before every public release:

```bash
npm run verify:public-repo
npm run typecheck
npm run lint
npm test
npm run build
```

The privacy check rejects tracked local environment files, private configuration, résumé/output directories, non-example email addresses, absolute home paths, embedded credential blocks, and common token formats. Review GitHub secret-scanning alerts too: cleaning the current tree does not erase old commits or third-party caches.

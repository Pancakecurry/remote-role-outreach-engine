# Final owner verification and activation

This document is owner-operated. Keep `OUTREACH_MODE=dry_run`, `OUTREACH_ENABLED=false`, and `DAILY_SEND_LIMIT=2` until every dry-run and self-test check below passes.

## A. Verify the private operational CRM

1. Start Docker Desktop and wait until it reports that the engine is running.
2. In the private repository, run `npm run stack:start` and then `npm run stack:verify`.
3. Open `http://localhost:3000`, then sign in at `/login` with the manually provisioned owner account.
4. Confirm the CRM header says **Operational mode**, not showcase mode; it must show DRY RUN and AUTOSEND DISABLED.
5. Open Dashboard, Sources, Jobs, Contacts, Outreach, Replies, Workflow Runs, and Settings. They must display authenticated Supabase state or an explicit Database unavailable state—never synthetic portfolio data.
6. Confirm jobs and application opportunities are visible when the database is reachable. Applications remain manual.

## B. Verify the separate public showcase

1. In the separate showcase repository, run its documented public-release and showcase checks.
2. Open the URL printed by Next.js. Confirm SHOWCASE DATA and SHOWCASE MODE are visible.
3. Confirm no login, Supabase project, Gmail OAuth, Gemini credential, real company, or production endpoint is required. Stop the preview when finished.

## C. Import the canonical unified workflow

1. Open `http://localhost:5678` and select **Workflows → Import from File**.
2. Import `n8n/workflows/remote_role_acquisition_engine.json` from the private repository.
3. Confirm the display name is **Remote Role Acquisition Engine** and leave it inactive.
4. Do not delete legacy workflows yet; keep them inactive until the imported workflow has passed owner review.
5. Zoom out and confirm the daily acquisition spine, outreach-state/Supabase band, delivery, inbox, follow-up, operations, self-test, and local error handling sections are visible.

## D. Assign credentials without exposing values

1. In n8n, create a **Header Auth** credential named `Remote Role Engine — Internal API`.
2. Set its header name to `X-Internal-Automation-Token` and paste the existing owner-managed internal token as its value. Do not place that value in workflow JSON or screenshots.
3. Assign this Header Auth credential to every internal HTTP Request node in the unified workflow.
4. Assign `Gmail Outreach — Dedicated` only to Gmail nodes in Email Delivery, Inbox Monitor, Follow-Up Engine, and Controlled Self Test. Do not assign Gmail to HTTP nodes.

## E. Dry-run acquisition test

1. Leave the unified workflow inactive and use the editor to execute only the Daily Acquisition branch manually.
2. Expected order: ingestion → qualification/ranking → contact discovery → draft generation.
3. Check CRM Dashboard, Jobs, Contacts, Outreach, and Workflow Runs afterward. Jobs without safe contact evidence remain recommended for manual application; zero contacts or zero drafts is valid.
4. Confirm every Gmail node shows zero execution and the production claim count remains zero.

## F. Controlled Gmail self-test

1. Do this only after the dry-run passes. Configure `SELF_TEST_MODE=true` and an owner-controlled `SELF_TEST_RECIPIENT` locally, then restart the stack.
2. Manually execute the Controlled Self Test branch once. It must claim at most one record marked as a test and send only to the owned recipient.
3. Reply from a different owner-controlled inbox, then manually execute the Inbox Monitor branch.
4. Confirm the test sequence becomes `REPLIED`, no follow-up remains due, and the test record is closed or removed.
5. Set `SELF_TEST_MODE=false`, restart the stack, and keep the unified workflow inactive.

## G. Optional production activation

Only proceed after a passing self-test and an explicit owner decision. Keep the daily limit at 2. Set `OUTREACH_MODE=live` and `OUTREACH_ENABLED=true`, restart with `npm run stack:restart`, and run `npm run verify:end-to-end`.

The unified workflow contains multiple Schedule Triggers. Activating this one workflow activates all of its schedule triggers together, so assign and verify Header Auth/Gmail credentials before activation. Activate only after the inbox monitor, follow-up engine, operations branch, and send queue have been reviewed. The manual self-test remains harmless unless manually executed with its separate gate.

For the first two real sends, inspect the CRM record before delivery: active role, correct company, public evidence, professional company-domain address, MX result, thresholds, truthful draft, no duplicate, and Gmail thread storage afterward. If anything is unexpected, immediately set `OUTREACH_ENABLED=false`, restart the stack, and deactivate the unified workflow.

## H. Screenshot, video, and publication checklist

Use the public showcase only for publicly shared CRM images. Capture Dashboard, Sources, Recommended Opportunities, Job Detail, Contacts, Outreach, and Operations. In n8n, capture the full unified workflow, a Daily Acquisition close-up, and a Gmail/reply/follow-up close-up; hide credential values and private email addresses.

Follow the showcase repository's `docs/DEMO_SCRIPT.md` for a short video. Show public pages first, then the inactive workflow canvas, and never expose private credentials or real contacts.

Before GitHub publication, run `npm run verify:public-release`, `npm run verify:showcase`, inspect `git status`, create a new public GitHub repository, add that remote only to the public showcase repository, and push that repository. Verify README and Mermaid rendering after push. Never push the private operational repository without a separate owner decision.

Portfolio assets are in the public repository under `showcase/content/`: `UPWORK_PORTFOLIO.md`, `LINKEDIN_POST.md`, `X_POST.md`, `RESUME_BULLET.md`, and `CLIENT_PITCH.md`. Copy and publish them manually only after reviewing the final wording.

# Final self-test and activation

1. In n8n, import `Remote Role Acquisition Engine` from `n8n/workflows/remote_role_acquisition_engine.json` and keep it inactive.
2. Assign `Remote Role Engine — Internal API` Header Auth to every internal HTTP node with header name `X-Internal-Automation-Token`.
3. Assign `Gmail Outreach — Dedicated` only to Gmail nodes. Leave the archived legacy workflows inactive in the n8n UI until final acceptance.
4. In dry-run mode, manually execute only the daily-acquisition branch of the unified workflow. Confirm no Gmail node executed and production claim returns zero.
5. Only after an explicit owner decision, set `SELF_TEST_MODE=true` and `SELF_TEST_RECIPIENT` locally, restart the stack, and run workflow 09 once.
6. Confirm exactly one message marked `[SELF TEST — NOT OUTREACH]` reaches an owner-controlled inbox, reply from another owned inbox, then run workflow 06.
7. Confirm the isolated test sequence becomes `REPLIED`, has no due follow-up, and is closed or removed. Set `SELF_TEST_MODE=false` and restart.
8. Production activation requires a passing self-test. Set `OUTREACH_MODE=live` and `AUTOSEND_ENABLED=true` only after that result, restart the stack, keep the daily limit at 2, and activate the one unified workflow.

Immediately deactivate the unified workflow and set autosend false for an unexpected recipient, unsupported claim, duplicate, bounce spike, thread failure, or reply that does not cancel follow-up.

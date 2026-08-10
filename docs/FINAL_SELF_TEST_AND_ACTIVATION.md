# Final self-test and activation

1. In n8n, assign one Header Auth credential to every internal HTTP node with header name `X-Internal-Automation-Token`.
2. Assign `Gmail Outreach — Dedicated` only to Gmail nodes. Keep workflows 01–09 inactive.
3. Import `00_remote_role_acquisition_master` alongside the existing templates, keep it inactive, and use it as the sole daily entry point. Workflow 01 remains a manual modular fallback.
4. In dry-run mode, manually execute workflows 01–04 or the master workflow. Confirm no Gmail node executed and production claim returns zero.
5. Only after an explicit owner decision, set `SELF_TEST_MODE=true` and `SELF_TEST_RECIPIENT` locally, restart the stack, and run workflow 09 once.
6. Confirm exactly one message marked `[SELF TEST — NOT OUTREACH]` reaches an owner-controlled inbox, reply from another owned inbox, then run workflow 06.
7. Confirm the isolated test sequence becomes `REPLIED`, has no due follow-up, and is closed or removed. Set `SELF_TEST_MODE=false` and restart.
8. Production activation requires a passing self-test. Set `OUTREACH_MODE=live` and `AUTOSEND_ENABLED=true` only after that result, restart the stack, keep the daily limit at 2, and enable workflows in this order: 06, 07, 08, 05, 00. Keep 01 and 09 inactive.

Immediately disable workflow 05 and set autosend false for an unexpected recipient, unsupported claim, duplicate, bounce spike, thread failure, or reply that does not cancel follow-up.

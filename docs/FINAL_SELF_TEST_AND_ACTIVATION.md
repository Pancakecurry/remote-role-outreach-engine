# Final self-test and activation

1. In n8n, assign one Header Auth credential to internal HTTP nodes with header name `x-internal-automation-token`.
2. Assign `Gmail Outreach — Dedicated` only to Gmail nodes. Keep workflows 01–09 inactive.
3. In dry-run mode, manually execute workflow 01 or 01–04 in sequence. Confirm no Gmail node executed and production claim returns zero.
4. Only after an explicit owner decision, set `SELF_TEST_MODE=true` and `SELF_TEST_RECIPIENT` locally, restart the stack, and run workflow 09 once.
5. Confirm exactly one message marked `[SELF TEST — NOT OUTREACH]` reaches an owner-controlled inbox, reply from another owned inbox, then run workflow 06.
6. Confirm the isolated test sequence becomes `REPLIED`, has no due follow-up, and is closed or removed. Set `SELF_TEST_MODE=false` and restart.
7. Production activation requires a passing self-test. Keep the daily limit at 2, run readiness verification, then enable workflows only in the documented order: 06, 07, 08, 05, 01. Keep 09 inactive.

Immediately disable workflow 05 and set autosend false for an unexpected recipient, unsupported claim, duplicate, bounce spike, thread failure, or reply that does not cancel follow-up.

# Controlled n8n integration gate

1. Start Next.js with `npm run dev`.
2. Confirm the local n8n container is running and persistent.
3. Import workflows `01` through `09` from `n8n/workflows` in numerical order.
4. Set the internal API base URL to `http://host.docker.internal:3000`.
5. Create an n8n Header Auth credential using the existing internal token without exposing or embedding it.
6. Configure that credential with the exact header name `x-internal-automation-token`, then assign it to internal HTTP nodes.
7. Assign `Gmail Outreach — Dedicated` to Gmail nodes after import; never put a credential ID or OAuth secret in JSON.
8. Keep every imported workflow inactive.
9. Manually run qualification, public-contact discovery, and draft-generation in dry-run mode. Workflow `01` chains ingestion → qualification → contacts → drafts and stops when a prior stage fails.
10. Confirm no Gmail operation occurred and the claim endpoint returns no live messages.
11. Run exactly one self-addressed Gmail test only after the owner explicitly chooses to do so in a later authorized turn. Workflow `09` must remain inactive until that authorization and can claim only one isolated `is_test=true` record.
12. Mark that isolated record `is_test=true`, use batch size one, and never mix it with production outreach.
13. Reply from another mailbox owned by the owner, then manually execute the reply monitor.
14. Confirm the test sequence is `REPLIED` and that no follow-up remains due; delete or close the test record afterward.
15. Never activate workflows before final approval.

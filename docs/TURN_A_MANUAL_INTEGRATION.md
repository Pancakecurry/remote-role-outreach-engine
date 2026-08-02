# Turn B manual integration

1. Start Next.js with `npm run dev` and confirm the n8n container is running.
2. Import workflows in numerical order from `n8n/workflows`.
3. Set `INTERNAL_API_BASE_URL` to `http://host.docker.internal:3000` in n8n.
4. Create an n8n Header Auth credential with header name `x-internal-automation-token` and the existing internal token; do not embed it in workflow JSON.
5. Assign the existing `Gmail Outreach — Dedicated` credential after import.
6. Keep every workflow inactive. Manually execute only the dry-run pipeline workflows.
7. A self-addressed Gmail send and reply-cancellation test is reserved for Turn B after explicit authorization.
8. Report only sanitized counts and statuses; never share credentials, email bodies, or addresses.

# Security model

Secrets belong only in ignored runtime configuration. `.env.local`, private candidate profiles, résumé PDFs, generated application material, local databases, and activation notes must never be committed. Public examples must contain synthetic values.

The browser uses only Supabase public configuration. Protected server routes validate the authenticated user and rely on row-level security. The Supabase secret key and internal automation token are server-only. n8n credentials are assigned in the operator's n8n instance; neither credential values nor local credential IDs belong in workflow JSON.

Public ATS and company-page content is untrusted input. Fetching is limited to supported providers and validated HTTPS origins with bounded responses and sanitized errors. The project does not bypass CAPTCHAs, authentication, robots controls, or platform safeguards. LinkedIn automation, guessed-email sending, SMTP probing, and paid contact enrichment are outside the design.

Outreach is fail-closed: dry-run is the default, sends are rate-limited and idempotent, public evidence is required, and reply, bounce, rejection, opt-out, suppression, manual pause, or role closure cancels follow-ups. Application records cannot claim success without confirmation.

Before publishing a release, verify tracked files, the full Git history, workflow credential blocks, and generated artifacts for secrets or personal data. Follow the commands in [the operations runbook](OPERATIONS_RUNBOOK.md).

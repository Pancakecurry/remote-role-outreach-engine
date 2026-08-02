# Data model

`profiles` is a one-to-one companion to `auth.users`. A security-definer trigger creates only the profile ID for each manually created user and intentionally copies no untrusted metadata. The authenticated user ID owns normal CRM rows; future trusted n8n actions use `APP_OWNER_USER_ID`.

`job_sources → jobs → outreach_sequences → messages/gmail_thread_references` describes the role and communication lifecycle. `companies → contact_people/email_candidates → contact_evidence` preserves public provenance. `suppression_entries` blocks email or company-role scope; `workflow_runs` and `integration_events` provide auditability. `messages.direction` distinguishes future inbound replies from outbound messages.

Jobs have owner-scoped dedup hashes. Evidence has an owner/email/source/email uniqueness guard. Sequences are unique by job/email; messages by sequence/kind; Gmail message IDs and integration dedup hashes are unique. RLS restricts exposed records to `auth.uid()` ownership; n8n must populate owner IDs from `APP_OWNER_USER_ID`.

Phase 2B-2 synthetic records use `is_demo=true` wherever a demo marker exists. `system_settings` is owner-scoped rather than demo-scoped and is seeded idempotently with dry-run-only values. Demo evidence and sequences are intentionally blocked from delivery.

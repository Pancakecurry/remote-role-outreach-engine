# Data model

`profiles` owns all private data. `job_sources → jobs → outreach_sequences → messages/gmail_thread_references` describes the role and communication lifecycle. `companies → contact_people/email_candidates → contact_evidence` preserves public provenance. `suppression_entries` blocks email or company-role scope; `workflow_runs` and `integration_events` provide auditability.

Jobs have owner-scoped dedup hashes. Evidence has an owner/email/source/email uniqueness guard. Sequences are unique by job/email; messages by sequence/kind; Gmail message IDs and integration dedup hashes are unique. RLS restricts exposed records to `auth.uid()` ownership; n8n must populate owner IDs from `APP_OWNER_USER_ID`.

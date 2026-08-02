-- Turn A release-candidate pipeline. Existing data and dry-run defaults are preserved.
alter table public.jobs
  add column deterministic_status text not null default 'PENDING' check (deterministic_status in ('PENDING','ELIGIBLE','REVIEW','REJECTED')),
  add column deterministic_score integer check (deterministic_score between 0 and 100),
  add column deterministic_reasons jsonb not null default '[]'::jsonb,
  add column gemini_assessment_status text not null default 'PENDING' check (gemini_assessment_status in ('PENDING','ASSESSED','FAILED','SKIPPED')),
  add column gemini_reasoning_summary text,
  add column strongest_matches jsonb not null default '[]'::jsonb,
  add column missing_requirements jsonb not null default '[]'::jsonb,
  add column relevant_project text,
  add column remote_eligibility text,
  add column seniority_classification text,
  add column final_priority_score numeric check (final_priority_score between 0 and 100),
  add column selected_for_action boolean not null default false,
  add column assessed_at timestamptz,
  add column assessment_model text,
  add column assessment_prompt_version text,
  add column application_status text not null default 'NOT_STARTED' check (application_status in ('NOT_STARTED','IN_PROGRESS','APPLIED','SKIPPED','CLOSED')),
  add column applied_at timestamptz,
  add column skipped_closed_reason text;

alter table public.contact_evidence
  add column mx_status text check (mx_status in ('PRESENT','ABSENT','TIMEOUT','ERROR','NOT_CHECKED')),
  add column selected_recipient boolean not null default false,
  add column content_hash text,
  add column fetched_at timestamptz;

create table public.contact_discovery_runs (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null, workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  status text not null check (status in ('SUCCEEDED','FAILED','SKIPPED','BLOCKED')), page_count integer not null default 0 check (page_count between 0 and 5),
  failure_category text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.outreach_sequences
  add column next_action_at timestamptz,
  add column claimed_at timestamptz,
  add column claim_lease_expires_at timestamptz,
  add column claim_token text,
  add column idempotency_key text,
  add column is_test boolean not null default false,
  add column replied_at timestamptz,
  add column bounced_at timestamptz,
  add column opted_out_at timestamptz;

alter table public.messages
  add column factual_claims_used jsonb not null default '[]'::jsonb,
  add column source_facts jsonb not null default '[]'::jsonb,
  add column draft_validation_status text not null default 'PENDING' check (draft_validation_status in ('PENDING','VALID','HUMAN_REVIEW','BLOCKED')),
  add column send_eligible boolean not null default false,
  add column idempotency_key text,
  add column is_test boolean not null default false;

create unique index jobs_selected_action_idx on public.jobs(owner_id, selected_for_action, final_priority_score desc) where active and not is_demo;
create index jobs_assessment_queue_idx on public.jobs(owner_id, deterministic_status, gemini_assessment_status, first_seen_at desc) where active and not is_demo;
create index evidence_recipient_idx on public.contact_evidence(owner_id, selected_recipient) where selected_recipient;
create unique index one_selected_recipient_per_email on public.contact_evidence(owner_id, email_candidate_id) where selected_recipient;
create unique index active_sequence_contact_unique on public.outreach_sequences(owner_id, job_id, email_candidate_id) where state not in ('REPLIED','BOUNCED','OPTED_OUT','CLOSED') and not paused;
create index sequence_due_idx on public.outreach_sequences(owner_id, next_action_at, state) where not paused;
create index discovery_runs_owner_time_idx on public.contact_discovery_runs(owner_id, created_at desc);

alter table public.contact_discovery_runs enable row level security;
create policy user_owns_rows on public.contact_discovery_runs for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger set_updated_at before update on public.contact_discovery_runs for each row execute function public.set_updated_at();

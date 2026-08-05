-- Final local-operation contracts. Forward-only; preserves existing jobs, evidence, and dry-run defaults.
alter table public.jobs
  add column assessment_attempt_count integer not null default 0 check (assessment_attempt_count between 0 and 2),
  add column assessment_failure_category text,
  add column assessment_schema_version text,
  add column assessment_started_at timestamptz,
  add column assessment_completed_at timestamptz,
  add column assessment_next_retry_at timestamptz,
  add column assessment_terminal boolean not null default false,
  add column gemini_eligible boolean,
  add column should_contact boolean,
  add column role_family text,
  add column candidate_profile_version text,
  add column assessment_content_hash text,
  add column application_notes text;

alter table public.jobs drop constraint if exists jobs_application_status_check;
alter table public.jobs add constraint jobs_application_status_check check (application_status in ('NOT_STARTED','IN_PROGRESS','APPLIED','INTERVIEW','REJECTED','SKIPPED','CLOSED'));

alter table public.companies
  add column domain_resolution_source text,
  add column domain_confidence text check (domain_confidence in ('VERIFIED','HIGH','MEDIUM','LOW','REJECTED')),
  add column domain_verified_at timestamptz,
  add column domain_rejection_reason text;

create table public.job_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  attempt_number integer not null check (attempt_number between 1 and 2),
  status text not null check (status in ('STARTED','SUCCEEDED','FAILED','SKIPPED')),
  failure_category text,
  terminal boolean not null default false,
  model text,
  prompt_version text not null,
  schema_version text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, job_id, attempt_number, prompt_version, schema_version)
);

create table public.job_application_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  from_status text,
  to_status text not null check (to_status in ('NOT_STARTED','IN_PROGRESS','APPLIED','INTERVIEW','REJECTED','SKIPPED','CLOSED')),
  note text,
  created_at timestamptz not null default now()
);

create table public.pipeline_execution_locks (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  lock_name text not null,
  lock_token text not null,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, lock_name)
);

create index jobs_assessment_incremental_idx on public.jobs(owner_id, active, deterministic_status, gemini_assessment_status, assessment_next_retry_at, first_seen_at desc) where not is_demo;
create index jobs_application_queue_idx on public.jobs(owner_id, selected_for_action, final_priority_score desc) where active and not is_demo;
create index assessment_attempts_job_idx on public.job_assessment_attempts(owner_id, job_id, started_at desc);
create index application_history_job_idx on public.job_application_history(owner_id, job_id, created_at desc);
create index pipeline_execution_lock_expiry_idx on public.pipeline_execution_locks(expires_at);

alter table public.job_assessment_attempts enable row level security;
alter table public.job_application_history enable row level security;
alter table public.pipeline_execution_locks enable row level security;
create policy user_owns_rows on public.job_assessment_attempts for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy user_owns_rows on public.job_application_history for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy user_owns_rows on public.pipeline_execution_locks for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger set_updated_at before update on public.job_assessment_attempts for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.pipeline_execution_locks for each row execute function public.set_updated_at();

-- Existing rows are intentionally left as historical attempts; only new execution records use the new retry contract.

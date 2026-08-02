-- Phase 3: public ATS ingestion only. This migration is forward-only and preserves Phase 2 data.
alter table public.job_sources
  add column provider text check (provider in ('GREENHOUSE','LEVER','ASHBY')),
  add column company_name text,
  add column company_domain text,
  add column board_identifier text,
  add column public_board_url text,
  add column provider_region text check (provider_region in ('GLOBAL','EU')),
  add column enabled boolean not null default false,
  add column priority integer not null default 100 check (priority between 1 and 1000),
  add column ingestion_interval_minutes integer not null default 1440 check (ingestion_interval_minutes between 60 and 10080),
  add column managed_seed boolean not null default false,
  add column last_attempt_at timestamptz,
  add column last_success_at timestamptz,
  add column last_failure_at timestamptz,
  add column consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  add column last_error_category text,
  add column last_job_count integer not null default 0 check (last_job_count >= 0),
  add column last_payload_hash text;

alter table public.jobs
  add column external_job_id text,
  add column provider text check (provider in ('GREENHOUSE','LEVER','ASHBY')),
  add column normalized_title text,
  add column description_text text,
  add column description_html text,
  add column workplace_type text check (workplace_type in ('REMOTE','HYBRID','ONSITE','UNKNOWN')),
  add column employment_type text,
  add column department text,
  add column team text,
  add column seniority_text text,
  add column country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  add column posting_url text,
  add column provider_updated_at timestamptz,
  add column published_at timestamptz,
  add column first_seen_at timestamptz,
  add column last_seen_at timestamptz,
  add column last_successful_fetch_id uuid,
  add column active boolean not null default true,
  add column consecutive_missing_runs integer not null default 0 check (consecutive_missing_runs >= 0),
  add column closed_at timestamptz,
  add column raw_payload_hash text,
  add column normalized_application_url_hash text,
  add column normalized_posting_url_hash text,
  add column qualification_status text not null default 'PENDING' check (qualification_status in ('PENDING','ASSESSING','QUALIFIED','NOT_QUALIFIED','MANUAL_REVIEW'));

create table public.job_source_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  source_id uuid not null references public.job_sources(id) on delete cascade,
  provider text not null check (provider in ('GREENHOUSE','LEVER','ASHBY')),
  status text not null check (status in ('SUCCEEDED','FAILED','SKIPPED','LOCKED')),
  fetched_count integer not null default 0 check (fetched_count >= 0),
  valid_count integer not null default 0 check (valid_count >= 0),
  malformed_count integer not null default 0 check (malformed_count >= 0),
  inserted_count integer not null default 0 check (inserted_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  unchanged_count integer not null default 0 check (unchanged_count >= 0),
  reopened_count integer not null default 0 check (reopened_count >= 0),
  newly_missing_count integer not null default 0 check (newly_missing_count >= 0),
  closed_count integer not null default 0 check (closed_count >= 0),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  payload_hash text,
  error_category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_ingestion_locks (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  locked_at timestamptz not null default now(),
  lock_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index job_sources_provider_board_owner_unique on public.job_sources(owner_id, provider, board_identifier) where provider is not null and board_identifier is not null;
create unique index jobs_provider_identity_unique on public.jobs(owner_id, source_id, external_job_id) where source_id is not null and external_job_id is not null;
create index job_sources_health_idx on public.job_sources(owner_id, enabled, consecutive_failures, priority);
create index jobs_ingestion_source_active_idx on public.jobs(owner_id, source_id, active, last_seen_at desc);
create index jobs_provider_updated_idx on public.jobs(owner_id, provider, provider_updated_at desc);
create index jobs_application_hash_idx on public.jobs(owner_id, normalized_application_url_hash);
create index jobs_posting_hash_idx on public.jobs(owner_id, normalized_posting_url_hash);
create index jobs_pending_assessment_idx on public.jobs(owner_id, qualification_status, active);
create index job_source_runs_source_time_idx on public.job_source_runs(owner_id, source_id, created_at desc);

alter table public.job_source_runs enable row level security;
alter table public.job_ingestion_locks enable row level security;
create policy user_owns_rows on public.job_source_runs for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy user_owns_rows on public.job_ingestion_locks for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger set_updated_at before update on public.job_source_runs for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.job_ingestion_locks for each row execute function public.set_updated_at();

-- Real job lifecycle is append/update-only: ingestion never deletes jobs merely because a board omits them.

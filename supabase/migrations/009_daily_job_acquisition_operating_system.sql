alter table public.jobs
  add column if not exists compensation_text text,
  add column if not exists compensation_band text not null default 'unknown',
  add column if not exists score_explanation jsonb not null default '[]'::jsonb,
  add column if not exists score_components jsonb not null default '{}'::jsonb,
  add column if not exists application_capability text not null default 'manual_only',
  add column if not exists pipeline_status text not null default 'discovered',
  add column if not exists next_action text,
  add column if not exists failure_reason text,
  add column if not exists selected_resume_id text,
  add column if not exists tailored_resume_path text;

alter table public.jobs drop constraint if exists jobs_compensation_band_check;
alter table public.jobs add constraint jobs_compensation_band_check check (compensation_band in ('below_target','acceptable','strong','exceptional','unknown'));
alter table public.jobs drop constraint if exists jobs_application_capability_check;
alter table public.jobs add constraint jobs_application_capability_check check (application_capability in ('auto_submit_supported','manual_only','approval_required','blocked'));
alter table public.jobs drop constraint if exists jobs_pipeline_status_check;
alter table public.jobs add constraint jobs_pipeline_status_check check (pipeline_status in ('discovered','qualified','package_ready','owner_input_required','approval_needed','manual_apply','submitted','outreach_ready','outreach_sent','follow_up_due','replied','interview','rejected','offer','closed'));

alter table public.job_sources
  add column if not exists auto_submit_supported boolean not null default false,
  add column if not exists application_capability text not null default 'manual_only',
  add column if not exists health_status text not null default 'unknown',
  add column if not exists next_retry_at timestamptz;

create table if not exists public.application_packages (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade, idempotency_key text not null,
  base_resume_id text not null, tailored_resume_path text, used_fallback_resume boolean not null default false,
  cover_letter text not null, why_fit text not null, salary_recommendation text not null,
  screening_answers jsonb not null default '[]'::jsonb, owner_input jsonb not null default '[]'::jsonb,
  application_notes text, capability text not null, status text not null default 'package_ready', failure_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id, job_id), unique(owner_id, idempotency_key)
);

create table if not exists public.application_audit_events (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade, package_id uuid references public.application_packages(id) on delete set null,
  event_type text not null, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists jobs_action_queue_idx on public.jobs(owner_id, pipeline_status, final_priority_score desc, first_seen_at desc) where active and not is_demo;
create index if not exists application_packages_owner_status_idx on public.application_packages(owner_id, status, updated_at desc);
create index if not exists application_audit_owner_idx on public.application_audit_events(owner_id, created_at desc);

alter table public.application_packages enable row level security;
alter table public.application_audit_events enable row level security;
create policy user_owns_application_packages on public.application_packages for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy user_owns_application_audit_events on public.application_audit_events for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger set_application_packages_updated_at before update on public.application_packages for each row execute function public.set_updated_at();

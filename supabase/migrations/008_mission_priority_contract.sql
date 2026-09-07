-- Compensation affects priority, never eligibility. Unknown compensation remains in the pipeline.
alter table public.jobs add column compensation_band text not null default 'unknown'
  check (compensation_band in ('below_target','acceptable','strong','exceptional','unknown'));
create index jobs_compensation_band_idx on public.jobs(owner_id, compensation_band) where active and not is_demo;

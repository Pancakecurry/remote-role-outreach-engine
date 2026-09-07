-- Priority scores are ranks, not identities. Migration 004 already supplies
-- the equivalent non-unique queue index. Do not prevent jobs sharing a score.
begin;
drop index if exists public.jobs_selected_action_idx;
commit;

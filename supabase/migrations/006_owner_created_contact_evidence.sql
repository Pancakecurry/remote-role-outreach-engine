-- Manual evidence is explicitly labelled so it can be removed only before any sequence exists.
alter table public.contact_evidence add column owner_created boolean not null default false;
create index contact_evidence_owner_created_idx on public.contact_evidence(owner_id, owner_created) where owner_created;

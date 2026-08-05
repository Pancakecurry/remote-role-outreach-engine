-- Isolated self-test records never reference production jobs, companies, contacts, or messages.
create table public.self_test_sequences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null,
  state text not null default 'PREPARED' check (state in ('PREPARED','CLAIMED','SENT','REPLIED','BOUNCED','OPTED_OUT','FAILED','CLOSED')),
  subject text not null check (subject like '[SELF TEST — NOT OUTREACH]%'),
  body_text text not null,
  is_test boolean not null default true check (is_test),
  claim_token text,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  gmail_message_id text,
  gmail_thread_id text,
  next_action_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, recipient)
);

create index self_test_sequences_owner_state_idx on public.self_test_sequences(owner_id, state, created_at desc);
alter table public.self_test_sequences enable row level security;
create policy user_owns_rows on public.self_test_sequences for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger set_updated_at before update on public.self_test_sequences for each row execute function public.set_updated_at();

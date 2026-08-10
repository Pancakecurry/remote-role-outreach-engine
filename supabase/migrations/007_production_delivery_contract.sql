-- Delivery remains off by default. This only permits a future owner-approved live mode.
alter type public.sequence_state add value if not exists 'INITIAL_CLAIMED';
alter type public.sequence_state add value if not exists 'FOLLOWUP_ONE_CLAIMED';
alter type public.sequence_state add value if not exists 'FOLLOWUP_TWO_CLAIMED';
alter type public.sequence_state add value if not exists 'FAILED';

alter table public.system_settings drop constraint if exists system_settings_outreach_mode_check;
alter table public.system_settings add constraint system_settings_outreach_mode_check check (outreach_mode in ('dry_run','live'));
alter table public.system_settings drop constraint if exists system_settings_autosend_enabled_check;
alter table public.system_settings add constraint system_settings_autosend_enabled_check check (autosend_enabled in (true, false));

create index if not exists sequences_claim_lease_idx on public.outreach_sequences(owner_id, claim_lease_expires_at) where claim_token is not null;
create index if not exists messages_sent_today_idx on public.messages(owner_id, sent_at desc) where status = 'SENT';

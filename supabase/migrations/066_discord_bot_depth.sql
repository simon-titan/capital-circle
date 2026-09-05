-- Discord-Bot-Vertiefung: Protokoll für den Rollen-Bestandsabgleich (reconcileDiscordRoles).
create table if not exists discord_sync_log (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  triggered_by text not null check (triggered_by in ('admin', 'script')),
  dry_run boolean not null,
  checked_count integer not null default 0,
  fixed_count integer not null default 0,
  details jsonb
);

create index if not exists discord_sync_log_run_at_idx on discord_sync_log (run_at desc);

alter table discord_sync_log enable row level security;

create policy "discord_sync_log_admin_select"
on discord_sync_log for select
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "discord_sync_log_admin_insert"
on discord_sync_log for insert
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

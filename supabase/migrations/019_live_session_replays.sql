-- Replays vergangener Live-Calls; optional Verknüpfung zu Events
create table if not exists live_session_replays (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete set null,
  title text not null,
  description text,
  replay_url text not null,
  thumbnail_storage_key text,
  recorded_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_session_replays_event on live_session_replays (event_id);
create index if not exists idx_live_session_replays_recorded on live_session_replays (recorded_at desc nulls last);

alter table live_session_replays enable row level security;

create policy "live_session_replays_select_authenticated"
on live_session_replays for select
using (auth.uid() is not null);

create policy "live_session_replays_admin_write"
on live_session_replays for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

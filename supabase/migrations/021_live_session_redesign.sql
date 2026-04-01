-- Live Session: Kategorien, Sessions, Sub-Abschnitte, Videos (Hetzner-Keys)
-- Ersetzt live_session_replays (Replay-URL) durch strukturierte Tabellen.

drop policy if exists "live_session_replays_select_authenticated" on live_session_replays;
drop policy if exists "live_session_replays_admin_write" on live_session_replays;
drop table if exists live_session_replays;

create table if not exists live_session_categories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_session_categories_position on live_session_categories (position asc);

create table if not exists live_sessions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references live_session_categories(id) on delete restrict,
  event_id uuid references events(id) on delete set null,
  title text not null,
  description text,
  thumbnail_storage_key text,
  recorded_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_sessions_category on live_sessions (category_id);
create index if not exists idx_live_sessions_event on live_sessions (event_id);
create index if not exists idx_live_sessions_recorded on live_sessions (recorded_at desc nulls last);

create table if not exists live_session_subcategories (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references live_sessions(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_session_subcategories_session on live_session_subcategories (session_id, position);

create table if not exists live_session_videos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references live_sessions(id) on delete cascade,
  subcategory_id uuid references live_session_subcategories(id) on delete set null,
  title text not null,
  description text,
  storage_key text not null,
  thumbnail_key text,
  duration_seconds int,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_session_videos_session on live_session_videos (session_id, position);

alter table live_session_categories enable row level security;
alter table live_sessions enable row level security;
alter table live_session_subcategories enable row level security;
alter table live_session_videos enable row level security;

create policy "live_session_categories_select_authenticated"
on live_session_categories for select
using (auth.uid() is not null);

create policy "live_session_categories_admin_write"
on live_session_categories for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "live_sessions_select_authenticated"
on live_sessions for select
using (auth.uid() is not null);

create policy "live_sessions_admin_write"
on live_sessions for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "live_session_subcategories_select_authenticated"
on live_session_subcategories for select
using (auth.uid() is not null);

create policy "live_session_subcategories_admin_write"
on live_session_subcategories for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "live_session_videos_select_authenticated"
on live_session_videos for select
using (auth.uid() is not null);

create policy "live_session_videos_admin_write"
on live_session_videos for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

insert into live_session_categories (title, position)
select 'Allgemein', 0
where not exists (select 1 from live_session_categories limit 1);

-- Nutzer: offizielle Wochenaufgabe erledigt + eigene Aufgaben
create table if not exists homework_user_official_done (
  user_id uuid not null references profiles(id) on delete cascade,
  homework_id uuid not null references homework(id) on delete cascade,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, homework_id)
);

create index if not exists idx_homework_official_user on homework_user_official_done (user_id);

create table if not exists homework_user_custom_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  homework_id uuid references homework(id) on delete set null,
  title text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_homework_custom_user on homework_user_custom_tasks (user_id);
create index if not exists idx_homework_custom_homework on homework_user_custom_tasks (homework_id);

alter table homework_user_official_done enable row level security;
alter table homework_user_custom_tasks enable row level security;

-- Idempotent: erneutes Ausführen (z. B. nach fehlgeschlagenem Lauf) ohne 42710
drop policy if exists "homework_official_select_own" on homework_user_official_done;
drop policy if exists "homework_official_insert_own" on homework_user_official_done;
drop policy if exists "homework_official_update_own" on homework_user_official_done;
drop policy if exists "homework_official_delete_own" on homework_user_official_done;

drop policy if exists "homework_custom_select_own" on homework_user_custom_tasks;
drop policy if exists "homework_custom_insert_own" on homework_user_custom_tasks;
drop policy if exists "homework_custom_update_own" on homework_user_custom_tasks;
drop policy if exists "homework_custom_delete_own" on homework_user_custom_tasks;

create policy "homework_official_select_own"
on homework_user_official_done for select
using (auth.uid() = user_id);

create policy "homework_official_insert_own"
on homework_user_official_done for insert
with check (auth.uid() = user_id);

create policy "homework_official_update_own"
on homework_user_official_done for update
using (auth.uid() = user_id);

create policy "homework_official_delete_own"
on homework_user_official_done for delete
using (auth.uid() = user_id);

create policy "homework_custom_select_own"
on homework_user_custom_tasks for select
using (auth.uid() = user_id);

create policy "homework_custom_insert_own"
on homework_user_custom_tasks for insert
with check (auth.uid() = user_id);

create policy "homework_custom_update_own"
on homework_user_custom_tasks for update
using (auth.uid() = user_id);

create policy "homework_custom_delete_own"
on homework_user_custom_tasks for delete
using (auth.uid() = user_id);

-- Subcategories (optional grouping inside a module)
create table if not exists subcategories (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0,
  created_at timestamptz default now()
);

-- Videos: either direct under module OR under a subcategory (exactly one parent)
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  subcategory_id uuid references subcategories(id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0,
  storage_key text not null,
  thumbnail_key text,
  duration_seconds int,
  is_published boolean default false,
  created_at timestamptz default now(),
  constraint video_parent_check check (
    (module_id is not null and subcategory_id is null)
    or (module_id is null and subcategory_id is not null)
  )
);

create index if not exists idx_subcategories_module_id on subcategories(module_id);
create index if not exists idx_videos_module_id on videos(module_id);
create index if not exists idx_videos_subcategory_id on videos(subcategory_id);
create index if not exists idx_videos_storage_key on videos(storage_key);

-- Migrate legacy module video columns into videos (nur wenn alte Spalten noch existieren — idempotent nach bereits ausgeführtem 006)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'modules'
      and column_name = 'video_storage_key'
  ) then
    insert into videos (module_id, subcategory_id, title, description, position, storage_key, thumbnail_key, duration_seconds, is_published, created_at)
    select
      m.id,
      null,
      m.title,
      null,
      0,
      m.video_storage_key,
      null,
      m.video_duration_seconds,
      coalesce(m.is_published, false),
      coalesce(m.created_at, now())
    from modules m
    where m.video_storage_key is not null
      and not exists (
        select 1 from videos v where v.module_id = m.id and v.storage_key = m.video_storage_key
      );
  end if;
end $$;

alter table modules drop column if exists video_storage_key;
alter table modules drop column if exists video_duration_seconds;

alter table subcategories enable row level security;
alter table videos enable row level security;

-- Idempotent: erneutes Anwenden nach bereits ausgeführtem 006 ohne Fehler
drop policy if exists "subcategories_select_authenticated" on subcategories;
create policy "subcategories_select_authenticated"
on subcategories for select
using (auth.uid() is not null);

drop policy if exists "subcategories_admin_write" on subcategories;
create policy "subcategories_admin_write"
on subcategories for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "videos_select_authenticated" on videos;
create policy "videos_select_authenticated"
on videos for select
using (auth.uid() is not null);

drop policy if exists "videos_admin_write" on videos;
create policy "videos_admin_write"
on videos for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));
